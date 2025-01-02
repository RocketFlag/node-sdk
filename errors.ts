export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export class APIError extends Error {
  constructor(message: string, public status: number, public statusText: string) {
    super(message);
    this.name = "APIError";
  }
}

export class InvalidResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidResponseError";
  }
}
