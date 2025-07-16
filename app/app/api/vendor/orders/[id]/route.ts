
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole, OrderStatus } from "@prisma/client";

// GET /api/vendor/orders/[id] - Get specific order
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== UserRole.VENDOR) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        vendorId: vendor.id,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          }
        },
        driver: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                phone: true,
                avatar: true,
              }
            },
            vehicleType: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleColor: true,
            vehiclePlate: true,
            rating: true,
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
                price: true,
                ingredients: true,
                allergens: true,
                prepTime: true,
              }
            }
          }
        },
        tracking: {
          orderBy: { timestamp: "desc" }
        },
        payment: {
          select: {
            id: true,
            status: true,
            paymentMethod: true,
            amount: true,
            platformFee: true,
            vendorAmount: true,
            createdAt: true,
          }
        },
        review: {
          include: {
            user: {
              select: {
                name: true,
                avatar: true,
              }
            }
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/vendor/orders/[id] - Update order status
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== UserRole.VENDOR) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status, estimatedDelivery, rejectionReason } = body;

    const vendor = await prisma.vendor.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Check if order exists and belongs to vendor
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: params.id,
        vendorId: vendor.id,
      }
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Validate status transition
    const validTransitions: { [key: string]: OrderStatus[] } = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
      [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.OUT_FOR_DELIVERY],
      [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
    };

    if (!validTransitions[existingOrder.status]?.includes(status)) {
      return NextResponse.json({ 
        error: `Invalid status transition from ${existingOrder.status} to ${status}` 
      }, { status: 400 });
    }

    // Update order
    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        status,
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
        actualDelivery: status === OrderStatus.DELIVERED ? new Date() : undefined,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
                price: true,
              }
            }
          }
        }
      }
    });

    // Create tracking record
    await prisma.orderTracking.create({
      data: {
        orderId: params.id,
        status,
        message: rejectionReason || getStatusMessage(status),
        timestamp: new Date(),
      }
    });

    // Create notification for customer
    await prisma.notification.create({
      data: {
        userId: order.customer.id,
        orderId: params.id,
        type: "order_update",
        title: "Order Status Updated",
        message: `Your order #${order.orderNumber} is now ${status.toLowerCase().replace('_', ' ')}`,
      }
    });

    // Create vendor notification
    await prisma.vendorNotification.create({
      data: {
        vendorId: vendor.id,
        type: "ORDER_STATUS_CHANGED",
        title: "Order Status Updated",
        message: `Order #${order.orderNumber} status changed to ${status}`,
        data: {
          orderId: params.id,
          status,
          customerName: order.customer.name,
        }
      }
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function getStatusMessage(status: OrderStatus): string {
  const messages: { [key: string]: string } = {
    [OrderStatus.CONFIRMED]: "Order confirmed and being prepared",
    [OrderStatus.PREPARING]: "Order is being prepared",
    [OrderStatus.READY_FOR_PICKUP]: "Order is ready for pickup",
    [OrderStatus.OUT_FOR_DELIVERY]: "Order is out for delivery",
    [OrderStatus.DELIVERED]: "Order has been delivered",
    [OrderStatus.CANCELLED]: "Order has been cancelled",
  };
  return messages[status] || "Order status updated";
}
