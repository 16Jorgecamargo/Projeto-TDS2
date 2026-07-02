export interface PushPayload {
  title: string;
  body: string;
}

export const pushProvider = {
  async send(_token: string, _payload: PushPayload): Promise<void> {},
};
