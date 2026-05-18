// types/midtrans-client.d.ts
declare module "midtrans-client" {
  export class Snap {
    constructor(options: { isProduction: boolean; serverKey: string; clientKey?: string });
    createTransactionToken(parameter: any): Promise<string>;
    transaction: {
      notification(notificationPayload: any): Promise<any>;
    };
  }
}