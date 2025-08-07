// config.js - Configuration for Azure API Management
export const CONFIG = {
  // Azure API Management Configuration
  // This setup is for Azure API Management (APIM) to keep API keys private
  AZURE_APIM_ENDPOINT: "https://your-apim-instance.azure-api.net/translator", // Your APIM endpoint
  AZURE_APIM_SUBSCRIPTION_KEY: "YOUR_APIM_SUBSCRIPTION_KEY_HERE", // APIM subscription key
  
  // Alternative: If you prefer direct Azure Translator API (less secure)
  // AZURE_TRANSLATOR_KEY: "YOUR_AZURE_TRANSLATOR_KEY_HERE",
  // AZURE_TRANSLATOR_REGION: "YOUR_REGION_HERE",
  // AZURE_TRANSLATOR_ENDPOINT: "https://api.cognitive.microsofttranslator.com",
  
  // API Management provides better security by:
  // 1. Hiding real API keys from client-side code
  // 2. Rate limiting and throttling
  // 3. Analytics and monitoring
  // 4. Request/response transformation
};

// Validation to ensure config is properly set
if (CONFIG.AZURE_APIM_SUBSCRIPTION_KEY === "YOUR_APIM_SUBSCRIPTION_KEY_HERE") {
  console.warn("⚠️  Azure API Management subscription key not configured in config.js");
  console.warn("Translation functionality will not work until you add your APIM subscription key");
  console.warn("Update AZURE_APIM_ENDPOINT and AZURE_APIM_SUBSCRIPTION_KEY with your actual values");
}