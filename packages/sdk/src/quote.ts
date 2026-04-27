export interface SwapQuoteParams {
  poolId: string;
  tokenInId: string;
  tokenOutId: string;
  amountIn: string; // raw decimal string
  slippageBps: number; // basis points e.g. 50 = 0.5%
}

export interface SwapQuote {
  amountOut: string;
  priceImpact: number; // 0–100 percentage
  lpFee: string;
  protocolFee: string;
  minimumReceived: string;
  executionPrice: string; // tokenOut per tokenIn
}

/**
 * Stub quote calculation — replace with real Soroban simulation once SDK is live.
 * Uses a constant-product approximation for demonstration.
 */
export function calculateSwapQuote(params: SwapQuoteParams): SwapQuote {
  const amountIn = parseFloat(params.amountIn);
  if (!amountIn || amountIn <= 0) {
    return {
      amountOut: "0",
      priceImpact: 0,
      lpFee: "0",
      protocolFee: "0",
      minimumReceived: "0",
      executionPrice: "0",
    };
  }

  // Stub: assume 1:1 pool with 1 000 000 liquidity each side
  const reserveIn = 1_000_000;
  const reserveOut = 1_000_000;
  const lpFeeBps = 30; // 0.3%

  const lpFeeAmt = amountIn * (lpFeeBps / 10_000);
  const amountInAfterFee = amountIn - lpFeeAmt;
  const amountOut = (reserveOut * amountInAfterFee) / (reserveIn + amountInAfterFee);

  const spotPrice = reserveOut / reserveIn;
  const executionPrice = amountOut / amountIn;
  const priceImpact = Math.max(0, ((spotPrice - executionPrice) / spotPrice) * 100);

  const slippageFactor = 1 - params.slippageBps / 10_000;
  const minimumReceived = amountOut * slippageFactor;

  return {
    amountOut: amountOut.toFixed(7),
    priceImpact: parseFloat(priceImpact.toFixed(4)),
    lpFee: lpFeeAmt.toFixed(7),
    protocolFee: "0",
    minimumReceived: minimumReceived.toFixed(7),
    executionPrice: executionPrice.toFixed(7),
  };
}
