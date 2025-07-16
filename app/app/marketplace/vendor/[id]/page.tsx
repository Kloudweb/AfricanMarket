
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { VendorProfile } from '@/components/marketplace/vendor-profile'

export const dynamic = 'force-dynamic'

interface VendorPageProps {
  params: {
    id: string
  }
  searchParams: {
    product?: string
  }
}

export default async function VendorPage({ params, searchParams }: VendorPageProps) {
  const vendorId = params.id
  const highlightProductId = searchParams.product

  // Fetch vendor data server-side for initial render
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      },
      products: {
        where: { isAvailable: true },
        include: {
          reviews: {
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: {
                  name: true,
                  avatar: true
                }
              }
            }
          }
        },
        orderBy: [
          { isPopular: 'desc' },
          { popularityScore: 'desc' },
          { displayOrder: 'asc' }
        ]
      },
      categories: {
        include: {
          products: {
            where: { isAvailable: true },
            select: {
              id: true,
              name: true,
              price: true,
              image: true
            }
          }
        }
      },
      reviews: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              avatar: true
            }
          },
          product: {
            select: {
              name: true
            }
          }
        }
      },
      hours: {
        orderBy: { dayOfWeek: 'asc' }
      },
      _count: {
        select: {
          reviews: true,
          orders: true,
          favorites: true
        }
      }
    }
  })

  if (!vendor) {
    notFound()
  }

  return (
    <VendorProfile 
      vendor={vendor}
      highlightProductId={highlightProductId}
    />
  )
}

export async function generateMetadata({ params }: VendorPageProps) {
  const vendor = await prisma.vendor.findUnique({
    where: { id: params.id },
    select: {
      businessName: true,
      description: true,
      businessType: true,
      logo: true
    }
  })

  if (!vendor) {
    return {
      title: 'Vendor Not Found'
    }
  }

  return {
    title: `${vendor.businessName} | African Marketplace`,
    description: vendor.description || `Order ${vendor.businessType} from ${vendor.businessName}`,
    openGraph: {
      title: vendor.businessName,
      description: vendor.description || `Order ${vendor.businessType} from ${vendor.businessName}`,
      images: vendor.logo ? [{ url: vendor.logo }] : [],
    },
  }
}
