import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`Making ${method} request to ${url}`, data || '');
  
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log(`Response from ${method} ${url}:`, res.status, res.statusText);
  
  if (!res.ok) {
    try {
      const errorText = await res.text();
      console.error(`Error in ${method} ${url}:`, errorText);
      throw new Error(`${res.status}: ${errorText || res.statusText}`);
    } catch (error) {
      console.error(`Failed to parse error response from ${method} ${url}:`, error);
      throw new Error(`${res.status}: ${res.statusText}`);
    }
  }
  
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    console.log(`Fetching data from ${url}`);
    
    try {
      const res = await fetch(url, {
        credentials: "include",
      });
      
      console.log(`Response from ${url}:`, res.status, res.statusText);
      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`Returning null for 401 response from ${url}`);
        return null;
      }
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Error fetching ${url}:`, res.status, errorText);
        throw new Error(`${res.status}: ${errorText || res.statusText}`);
      }
      
      const data = await res.json();
      console.log(`Successful data from ${url}:`, data);
      return data;
    } catch (error) {
      console.error(`Error in query function for ${url}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
