

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Google Maps API integration for navigation
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      action, // 'directions', 'geocode', 'distance_matrix', 'place_details'
      origin,
      destination,
      waypoints,
      travelMode = 'DRIVING',
      avoidTolls = false,
      avoidHighways = false,
      address,
      placeId
    } = await req.json()

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id },
      include: { driverSettings: true }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    // Mock Google Maps API responses for demonstration
    // In production, you would use the actual Google Maps API
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'your-api-key'

    switch (action) {
      case 'directions':
        // Get driving directions
        if (!origin || !destination) {
          return NextResponse.json({ 
            error: 'Origin and destination are required for directions' 
          }, { status: 400 })
        }

        // Mock response structure similar to Google Maps Directions API
        const directionsResponse = {
          routes: [
            {
              legs: [
                {
                  distance: { text: '5.2 km', value: 5200 },
                  duration: { text: '12 mins', value: 720 },
                  start_address: typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`,
                  end_address: typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`,
                  steps: [
                    {
                      distance: { text: '0.5 km', value: 500 },
                      duration: { text: '2 mins', value: 120 },
                      html_instructions: 'Head <b>north</b> on <b>Water St</b> toward <b>Duckworth St</b>',
                      start_location: { lat: 47.5615, lng: -52.7126 },
                      end_location: { lat: 47.5665, lng: -52.7126 }
                    }
                  ]
                }
              ],
              overview_polyline: {
                points: 'mockPolylineEncodedString'
              },
              summary: 'Water St and Duckworth St',
              warnings: [],
              waypoint_order: []
            }
          ],
          status: 'OK'
        }

        return NextResponse.json({
          directions: directionsResponse,
          metadata: {
            origin,
            destination,
            waypoints,
            travelMode,
            avoidTolls,
            avoidHighways,
            requestedBy: driver.id,
            timestamp: new Date().toISOString()
          }
        })

      case 'geocode':
        // Geocode an address
        if (!address) {
          return NextResponse.json({ 
            error: 'Address is required for geocoding' 
          }, { status: 400 })
        }

        const geocodeResponse = {
          results: [
            {
              address_components: [
                {
                  long_name: '123',
                  short_name: '123',
                  types: ['street_number']
                },
                {
                  long_name: 'Water Street',
                  short_name: 'Water St',
                  types: ['route']
                },
                {
                  long_name: 'St. John\'s',
                  short_name: 'St. John\'s',
                  types: ['locality', 'political']
                },
                {
                  long_name: 'Newfoundland and Labrador',
                  short_name: 'NL',
                  types: ['administrative_area_level_1', 'political']
                }
              ],
              formatted_address: '123 Water St, St. John\'s, NL, Canada',
              geometry: {
                location: { lat: 47.5615, lng: -52.7126 },
                location_type: 'ROOFTOP',
                viewport: {
                  northeast: { lat: 47.5628, lng: -52.7113 },
                  southwest: { lat: 47.5602, lng: -52.7139 }
                }
              },
              place_id: 'ChIJmockPlaceId',
              types: ['street_address']
            }
          ],
          status: 'OK'
        }

        return NextResponse.json({
          geocode: geocodeResponse,
          metadata: {
            address,
            requestedBy: driver.id,
            timestamp: new Date().toISOString()
          }
        })

      case 'distance_matrix':
        // Get distance matrix for multiple origins/destinations
        const distanceMatrixResponse = {
          destination_addresses: [
            typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`
          ],
          origin_addresses: [
            typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`
          ],
          rows: [
            {
              elements: [
                {
                  distance: { text: '5.2 km', value: 5200 },
                  duration: { text: '12 mins', value: 720 },
                  status: 'OK'
                }
              ]
            }
          ],
          status: 'OK'
        }

        return NextResponse.json({
          distanceMatrix: distanceMatrixResponse,
          metadata: {
            origins: [origin],
            destinations: [destination],
            travelMode,
            requestedBy: driver.id,
            timestamp: new Date().toISOString()
          }
        })

      case 'place_details':
        // Get place details
        if (!placeId) {
          return NextResponse.json({ 
            error: 'Place ID is required for place details' 
          }, { status: 400 })
        }

        const placeDetailsResponse = {
          result: {
            place_id: placeId,
            name: 'Sample Restaurant',
            formatted_address: '123 Water St, St. John\'s, NL, Canada',
            geometry: {
              location: { lat: 47.5615, lng: -52.7126 }
            },
            formatted_phone_number: '(709) 555-1234',
            opening_hours: {
              open_now: true,
              weekday_text: [
                'Monday: 9:00 AM – 10:00 PM',
                'Tuesday: 9:00 AM – 10:00 PM',
                'Wednesday: 9:00 AM – 10:00 PM',
                'Thursday: 9:00 AM – 10:00 PM',
                'Friday: 9:00 AM – 11:00 PM',
                'Saturday: 9:00 AM – 11:00 PM',
                'Sunday: 10:00 AM – 9:00 PM'
              ]
            },
            rating: 4.5,
            user_ratings_total: 150,
            types: ['restaurant', 'food', 'establishment']
          },
          status: 'OK'
        }

        return NextResponse.json({
          placeDetails: placeDetailsResponse,
          metadata: {
            placeId,
            requestedBy: driver.id,
            timestamp: new Date().toISOString()
          }
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error with Google Maps API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get saved navigation preferences
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id },
      include: { driverSettings: true }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    const navigationPreferences = {
      preferredMapProvider: driver.driverSettings?.preferredMapProvider || 'GOOGLE',
      avoidTolls: driver.driverSettings?.avoidTolls || false,
      avoidHighways: driver.driverSettings?.avoidHighways || false,
      voiceNavigationEnabled: driver.driverSettings?.voiceNavigationEnabled || true,
      defaultTravelMode: 'DRIVING',
      units: 'metric'
    }

    return NextResponse.json({
      preferences: navigationPreferences,
      apiStatus: {
        googleMapsEnabled: !!process.env.GOOGLE_MAPS_API_KEY,
        features: [
          'directions',
          'geocoding',
          'distance_matrix',
          'place_details',
          'real_time_traffic'
        ]
      }
    })
  } catch (error) {
    console.error('Error fetching navigation preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
