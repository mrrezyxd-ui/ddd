export interface ApironeTickerResponse {
  [currency: string]: {
    [fiat: string]: number;
  };
}

export interface ApironeWalletInfo {
  wallet: string;
  currency: string;
  address?: string;
  balance?: number;
  unconfirmed_balance?: number;
  callback_url?: string;
}

export interface ApironeAddressResponse {
  address: string;
  created: string;
  currency: string;
  message?: string;
}

export interface ApironeCallbackPayload {
  address: string;
  amount: number; // in satoshis / litoshis or currency units
  currency: string;
  txid: string;
  confirmations: number;
  data?: string;
  fee?: number;
  vout?: number;
}

export interface ApironeTransferRequest {
  wallet: string;
  transfer_key: string;
  destinations: {
    address: string;
    amount: number; // in litoshis or LTC
  }[];
}

export interface ApironeTransferResponse {
  txid?: string;
  message?: string;
  status?: string;
  details?: any;
}
