import { redirect } from "next/navigation"

export default function HomePage() {
  // Redirect to login page as the main entry point
  redirect("/auth/login")
}
