import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options?: { method?: string; data?: unknown },
): Promise<Response> {
  const method = options?.method || 'GET';
  const data = options?.data;
  
  // Ensure we have an absolute URL
  const absoluteUrl = url.startsWith('http') 
    ? url 
    : (window.location.origin + (url.startsWith('/') ? url : `/${url}`));
  
  console.log(`Making ${method} request to ${absoluteUrl}`, data || '');
  
  const res = await fetch(absoluteUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log(`Response from ${method} ${absoluteUrl}:`, res.status, res.statusText);
  
  if (!res.ok) {
    try {
      const errorText = await res.text();
      console.error(`Error in ${method} ${absoluteUrl}:`, errorText);
      throw new Error(`${res.status}: ${errorText || res.statusText}`);
    } catch (error) {
      console.error(`Failed to parse error response from ${method} ${absoluteUrl}:`, error);
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
    const rawUrl = queryKey[0] as string;
    
    // Ensure we have an absolute URL
    const url = rawUrl.startsWith('http') 
      ? rawUrl 
      : (window.location.origin + (rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`));
      
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
