// types/midtrans-client.d.ts
declare module "midtrans-client" {
  export class Snap {
    constructor(options: { isProduction: boolean; serverKey: string; clientKey?: string });
    
    // Diubah: Menggunakan Record<string, unknown> karena parameter transaksi Midtrans selalu berbentuk objek JSON
    createTransactionToken(parameter: Record<string, unknown>): Promise<string>;
    
    transaction: {
      // Diubah: notificationPayload berbentuk objek JSON, dan kembalian Promise-nya diubah ke unknown agar aman saat di-parsing
      notification(notificationPayload: Record<string, unknown>): Promise<unknown>;
    };
  }
}