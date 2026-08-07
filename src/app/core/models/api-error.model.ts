export interface FieldMessage {
  fieldName: string;
  message: string;
}

export interface StandardError {
  timestamp: number;
  status: number;
  error: string;
  message: string;
  path: string;
}

export interface ValidationError extends StandardError {
  errors: FieldMessage[];
}
