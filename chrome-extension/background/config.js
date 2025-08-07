// config.js - Configuration for Azure Translator API
export const CONFIG = {
  AZURE_TRANSLATOR_KEY: "",
  AZURE_TRANSLATOR_REGION: "",
  AZURE_TRANSLATOR_ENDPOINT: "https://translator-api-mgmt.azure-api.net/translator"
};

// Note: This setup uses Azure API Management where authentication 
// is handled by the endpoint itself, so key and region can be empty
console.log('Azure Translator API configuration loaded');