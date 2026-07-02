const crypto = require("crypto");

/**
 * Click Shop API (v2) signature check.
 * Docs (merchant cabinet): https://docs.click.uz/en/click-api-request/
 *
 * Prepare (action=0):
 *   md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)
 *
 * Complete (action=1):
 *   md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + merchant_prepare_id + amount + action + sign_time)
 */
function verifyClickSignature(body) {
  const secret = process.env.CLICK_SECRET_KEY;
  const {
    click_trans_id,
    service_id,
    merchant_trans_id,
    merchant_prepare_id,
    amount,
    action,
    sign_time,
    sign_string,
  } = body;

  const base =
    action === "1" || action === 1
      ? `${click_trans_id}${service_id}${secret}${merchant_trans_id}${merchant_prepare_id}${amount}${action}${sign_time}`
      : `${click_trans_id}${service_id}${secret}${merchant_trans_id}${amount}${action}${sign_time}`;

  const expected = crypto.createHash("md5").update(base).digest("hex");
  return expected === sign_string;
}

// Standard Click error codes
const CLICK_ERROR = {
  SUCCESS: 0,
  SIGN_FAILED: -1,
  AMOUNT_MISMATCH: -2,
  ACTION_NOT_FOUND: -3,
  ALREADY_PAID: -4,
  USER_NOT_FOUND: -5,
  TRANSACTION_NOT_FOUND: -6,
  UPDATE_FAILED: -7,
  REQUEST_ERROR: -8,
  TRANSACTION_CANCELLED: -9,
};

module.exports = { verifyClickSignature, CLICK_ERROR };
