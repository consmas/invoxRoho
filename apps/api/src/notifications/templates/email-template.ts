export interface EmailTemplate {
  key: string;
  subject: string;
  html: string;
  text: string;
  requiredVariables?: string[];
}
