import React from "react";
import { useAuth } from "@/src/auth-context";
import UserHome from "@/src/components/UserHome";
import MechanicHome from "@/src/components/MechanicHome";

export default function HomeIndex() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "mechanic") return <MechanicHome />;
  return <UserHome />;
}
