export interface EmailPayload {
  title: string;
  body: string;
}

export const emailProvider = {
  async send(_userId: string, _payload: EmailPayload): Promise<void> {},
};
