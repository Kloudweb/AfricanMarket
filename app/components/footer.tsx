
import Link from "next/link"
import { MapPin, Phone, Mail } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-muted/50 border-t">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="bg-orange-500 text-white font-bold text-xl w-10 h-10 rounded-lg flex items-center justify-center">
                AM
              </div>
              <span className="font-bold text-xl">AfricanMarket</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Connecting the African community in Newfoundland with authentic food and reliable transport.
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold mb-4">Services</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/marketplace" className="text-muted-foreground hover:text-foreground">
                  Food Delivery
                </Link>
              </li>
              <li>
                <Link href="/rideshare" className="text-muted-foreground hover:text-foreground">
                  Rideshare
                </Link>
              </li>
            </ul>
          </div>

          {/* For Partners */}
          <div>
            <h3 className="font-semibold mb-4">For Partners</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/auth/signup?role=vendor" className="text-muted-foreground hover:text-foreground">
                  Become a Vendor
                </Link>
              </li>
              <li>
                <Link href="/auth/signup?role=driver" className="text-muted-foreground hover:text-foreground">
                  Become a Driver
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Newfoundland, Canada</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">+1 (709) 555-0123</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">info@africanmarket.ca</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; 2024 AfricanMarket. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
