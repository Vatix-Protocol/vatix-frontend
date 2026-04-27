export interface Token {
  id: string;
  symbol: string;
  name: string;
  logoUrl: string | null;
}

export interface TokenPair {
  tokenIn: Token | null;
  tokenOut: Token | null;
}
