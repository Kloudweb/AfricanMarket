
'use client'

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Mail, Lock, User, Phone, UserCheck } from "lucide-react"
import { toast } from "sonner"
import { UserRole } from "@prisma/client"

export function SignUpForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole>("CUSTOMER")
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultRole = searchParams.get("role")?.toUpperCase() || "CUSTOMER"

  // Set default role on component mount
  useEffect(() => {
    if (defaultRole && ["CUSTOMER", "VENDOR", "DRIVER"].includes(defaultRole)) {
      setSelectedRole(defaultRole as UserRole)
    }
  }, [defaultRole])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const userData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      role: selectedRole,
      acceptTerms,
    }

    const confirmPassword = formData.get("confirmPassword") as string
    
    // Validate all required fields
    if (!userData.email || !userData.password || !userData.name || !acceptTerms) {
      setError("Please fill in all required fields and accept the terms and conditions")
      setIsLoading(false)
      return
    }
    
    if (userData.password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (!acceptTerms) {
      setError("You must accept the terms and conditions to create an account")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      })

      if (response.ok) {
        toast.success("Account created successfully!")
        
        // Automatically sign in the user
        const result = await signIn("credentials", {
          email: userData.email,
          password: userData.password,
          redirect: false,
        })

        if (result?.error) {
          setError("Account created but failed to sign in. Please try signing in manually.")
        } else {
          router.push("/dashboard")
          router.refresh()
        }
      } else {
        const data = await response.json()
        setError(data.error || "Failed to create account")
      }
    } catch (error) {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Enter your full name"
            required
            className="pl-10"
            disabled={isLoading}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            required
            className="pl-10"
            disabled={isLoading}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="Enter your phone number"
            className="pl-10"
            disabled={isLoading}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="role">Account Type</Label>
        <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)} disabled={isLoading}>
          <SelectTrigger>
            <SelectValue placeholder="Select account type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CUSTOMER">Customer</SelectItem>
            <SelectItem value="VENDOR">Vendor</SelectItem>
            <SelectItem value="DRIVER">Driver</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Create a password"
            required
            className="pl-10"
            disabled={isLoading}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            required
            className="pl-10"
            disabled={isLoading}
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="acceptTerms"
          checked={acceptTerms}
          onCheckedChange={(checked) => setAcceptTerms(checked === true)}
          disabled={isLoading}
        />
        <Label htmlFor="acceptTerms" className="text-sm">
          I agree to the{" "}
          <a href="#" className="text-orange-500 hover:text-orange-600 underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="text-orange-500 hover:text-orange-600 underline">
            Privacy Policy
          </a>
        </Label>
      </div>
      
      <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating account...
          </>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  )
}
