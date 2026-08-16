"use client";
import { useCallback, useEffect, useState } from "react";
import type { AuthUser } from "@/lib/auth/types";

export function useCurrentUser() {
  const [user,setUser]=useState<AuthUser|null>(null);
  const [ready,setReady]=useState(false);
  const refresh=useCallback(async()=>{
    try { const response=await fetch("/api/auth/me",{cache:"no-store"}); const value=response.ok?((await response.json()) as {user:AuthUser}).user:null;setUser(value?{...value,permissions:Array.isArray(value.permissions)?value.permissions:[]}:null); }
    catch { setUser(null); }
    finally { setReady(true); }
  },[]);
  useEffect(()=>{void refresh();window.addEventListener("cuvee-auth-changed",refresh);return()=>window.removeEventListener("cuvee-auth-changed",refresh);},[refresh]);
  return {user,ready,refresh};
}
