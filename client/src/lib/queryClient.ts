import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  urlOrMethod: string,
  methodOrUrlOrData?: string | { method?: string; data?: unknown },
  data?: any
): Promise<Response> {
  let url: string;
  let method: string = 'GET';
  let requestData: any = undefined;
  
  // Handle the different ways this function is being called
  if (urlOrMethod.toUpperCase() === 'GET' || 
      urlOrMethod.toUpperCase() === 'POST' || 
      urlOrMethod.toUpperCase() === 'PUT' || 
      urlOrMethod.toUpperCase() === 'DELETE' || 
      urlOrMethod.toUpperCase() === 'PATCH') {
    // Called as apiRequest('POST', '/api/endpoint', data)
    method = urlOrMethod.toUpperCase();
    url = methodOrUrlOrData as string;
    requestData = data;
  } else {
    // Called as apiRequest('/api/endpoint', 'POST', data) or
    // apiRequest('/api/endpoint', { method: 'POST', data: {...} })
    url = urlOrMethod;
    
    if (typeof methodOrUrlOrData === 'string') {
      // It's apiRequest('/api/endpoint', 'POST', data)
      method = methodOrUrlOrData.toUpperCase();
      requestData = data;
    } else if (methodOrUrlOrData && typeof methodOrUrlOrData === 'object') {
      // It's apiRequest('/api/endpoint', { method: 'POST', data: {...} })
      method = methodOrUrlOrData.method?.toUpperCase() || 'GET';
      requestData = methodOrUrlOrData.data;
    }
  }
  
  // Ensure we have an absolute URL and don't include the method in the URL
  let absoluteUrl = url.startsWith('http') 
    ? url 
    : (window.location.origin + (url.startsWith('/') ? url : `/${url}`));
  
  // Check if the URL accidentally contains the method name (like ending with /POST)
  if (absoluteUrl.endsWith('/' + method)) {
    // Fix the URL by removing the method
    absoluteUrl = absoluteUrl.substring(0, absoluteUrl.length - ('/' + method).length);
    console.warn('Fixed malformed URL that contained HTTP method:', absoluteUrl);
  }
  
  console.log(`Making ${method} request to ${absoluteUrl}`, requestData || '');
  
  const res = await fetch(absoluteUrl, {
    method,
    headers: requestData ? { "Content-Type": "application/json" } : {},
    body: requestData ? JSON.stringify(requestData) : undefined,
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
    
    // Ensure we have an absolute URL and fix any method name in the URL
    let url = rawUrl.startsWith('http') 
      ? rawUrl 
      : (window.location.origin + (rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`));
    
    // Check for common HTTP methods in the URL and fix if needed
    const methodNames = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    for (const method of methodNames) {
      if (url.endsWith('/' + method)) {
        url = url.substring(0, url.length - ('/' + method).length);
        console.warn(`Fixed URL that incorrectly included HTTP method: ${url}`);
        break;
      }
    }
      
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
