/**
 * Camera URL/IP validation utilities to prevent SSRF attacks
 */

/**
 * Validates a camera IP address is safe to use
 * - Rejects localhost (127.0.0.0/8)
 * - Rejects cloud metadata service IPs (169.254.169.254)
 * - Allows private ranges (192.168.x.x, 10.x.x.x) for local IoT devices
 */
export function isValidCameraIP(ip: string): { valid: boolean; error?: string } {
  if (!ip || ip.trim() === '') {
    return { valid: true }; // Empty is allowed
  }

  const trimmedIP = ip.trim();
  const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = trimmedIP.match(ipRegex);
  
  if (!match) {
    return { valid: false, error: 'Invalid IP address format' };
  }

  const octets = [
    parseInt(match[1], 10),
    parseInt(match[2], 10),
    parseInt(match[3], 10),
    parseInt(match[4], 10),
  ];

  // Validate each octet is in range
  if (!octets.every(o => o >= 0 && o <= 255)) {
    return { valid: false, error: 'Invalid IP address format' };
  }

  // Reject localhost (127.0.0.0/8)
  if (octets[0] === 127) {
    return { valid: false, error: 'Localhost addresses are not allowed' };
  }

  // Reject cloud metadata service (169.254.169.254)
  if (octets[0] === 169 && octets[1] === 254 && octets[2] === 169 && octets[3] === 254) {
    return { valid: false, error: 'Cloud metadata IP is not allowed' };
  }

  // Reject link-local (169.254.0.0/16 - except already handled above)
  if (octets[0] === 169 && octets[1] === 254) {
    return { valid: false, error: 'Link-local addresses are not allowed' };
  }

  // Reject 0.0.0.0
  if (octets.every(o => o === 0)) {
    return { valid: false, error: 'Invalid IP address' };
  }

  return { valid: true };
}

/**
 * Validates an RTSP URL is safe to use
 * - Only allows rtsp://, http://, https:// schemes
 * - Validates hostname against the same rules as IP validation
 * - Rejects dangerous protocols (file://, javascript:, etc.)
 */
export function isValidCameraURL(url: string): { valid: boolean; error?: string } {
  if (!url || url.trim() === '') {
    return { valid: true }; // Empty is allowed
  }

  const trimmedURL = url.trim();

  // Check for dangerous protocols
  const dangerousProtocols = ['file:', 'javascript:', 'data:', 'vbscript:', 'about:'];
  const lowerURL = trimmedURL.toLowerCase();
  
  if (dangerousProtocols.some(proto => lowerURL.startsWith(proto))) {
    return { valid: false, error: 'Invalid protocol' };
  }

  // Only allow safe protocols
  const allowedProtocols = ['rtsp://', 'http://', 'https://'];
  if (!allowedProtocols.some(proto => lowerURL.startsWith(proto))) {
    return { valid: false, error: 'Only rtsp://, http://, or https:// URLs are allowed' };
  }

  try {
    // Parse URL to extract hostname
    const urlObj = new URL(trimmedURL.replace(/^rtsp:/, 'http:'));
    const hostname = urlObj.hostname;

    // If hostname is an IP, validate it
    const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    if (ipRegex.test(hostname)) {
      const ipValidation = isValidCameraIP(hostname);
      if (!ipValidation.valid) {
        return ipValidation;
      }
    }

    // Allow local relay endpoints used by go2rtc on the same machine.
    const allowedLocalHostnames = ['localhost', '127.0.0.1', '::1'];
    if (allowedLocalHostnames.includes(hostname.toLowerCase())) {
      return { valid: true };
    }

    // Block metadata/internal sensitive hostnames.
    const blockedHostnames = ['metadata.google.internal'];
    if (blockedHostnames.includes(hostname.toLowerCase())) {
      return { valid: false, error: 'Internal hostnames are not allowed' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Sanitizes camera configuration before saving
 */
export function sanitizeCameraConfig(ip: string | null, rtspUrl: string | null): {
  camera_ip: string | null;
  camera_rtsp_url: string | null;
  errors: string[];
} {
  const errors: string[] = [];
  let sanitizedIP: string | null = null;
  let sanitizedURL: string | null = null;

  if (ip) {
    const ipValidation = isValidCameraIP(ip);
    if (ipValidation.valid) {
      sanitizedIP = ip.trim();
    } else {
      errors.push(`Camera IP: ${ipValidation.error}`);
    }
  }

  if (rtspUrl) {
    const urlValidation = isValidCameraURL(rtspUrl);
    if (urlValidation.valid) {
      sanitizedURL = rtspUrl.trim();
    } else {
      errors.push(`RTSP URL: ${urlValidation.error}`);
    }
  }

  return {
    camera_ip: sanitizedIP,
    camera_rtsp_url: sanitizedURL,
    errors,
  };
}
