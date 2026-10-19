// Only load Figma's editor capture helper when a capture URL is opened.
if (location.hash.includes("figmacapture=")) {
  const capture = document.createElement("script");
  capture.src = "https://mcp.figma.com/mcp/html-to-design/capture.js";
  capture.async = true;
  document.head.append(capture);
}
