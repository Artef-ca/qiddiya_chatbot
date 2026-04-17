import { MainLayout } from "@/components";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth/jwt";

const ProtectedLayout = async ({ children }: { children: React.ReactNode }) => {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  
  if (!token) {
    redirect("/login");
  }
  
  const decoded = verifyToken(token) as {
    name: string;
    email?: string;
    id?: string;
  } | null;
  
  if (!decoded) {
    redirect("/login");
  }
  
  const username = decoded.name || "";
  console.log(username);
  return (
    <MainLayout />
  );
};

export default ProtectedLayout;
