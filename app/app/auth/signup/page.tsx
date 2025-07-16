
import { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SignUpForm } from "@/components/auth/signup-form"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Sign Up - AfricanMarket",
  description: "Create your AfricanMarket account",
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </Link>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-orange-500 text-white font-bold text-2xl w-16 h-16 rounded-lg flex items-center justify-center">
                AM
              </div>
            </div>
            <CardTitle className="text-2xl">Join our community</CardTitle>
            <CardDescription>
              Create your AfricanMarket account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Loading...</div>}>
              <SignUpForm />
            </Suspense>
            
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link href="/auth/signin" className="text-orange-500 hover:text-orange-600 font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
