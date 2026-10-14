# Sandbox access checklist

This checklist is for authorized e-invoice and e-way bill sandbox testing. Production stays disabled. Do not call a sandbox endpoint until every item below is true.

1. Register on the NIC e-invoice API sandbox as a taxpayer, GSP, ERP, or e-commerce operator: https://einv-apisandbox.nic.in/apicredentials.html
2. Verify the PAN or GSTIN and the mobile number and email already registered on the GST portal. Complete the OTP.
3. Store the sandbox client id, client secret, username, and password only in the secret manager. Set `GST_CREDENTIALS_ENCRYPTION_KEY` before any ciphertext is written. Do not put the key in the database or in API responses.
4. Keep sandbox values in `GST_EINVOICE_*` and `GST_EWAY_*`. Do not reuse them as production credentials.
5. Confirm the sandbox hosts. The e-invoice sandbox base used by this app is `https://einv-apisandbox.nic.in`. The e-way sandbox hosts published by NIC are `https://ewb1api.gstsandbox.nic.in/ewaybillapi/v1.03/` and `https://ewb2api.gstsandbox.nic.in/ewaybillapi/v1.03/`.
6. Set `GST_SANDBOX_LIVE=true` only on a machine that is allowed to call those hosts. Without that flag, this application does not place a live sandbox call.
7. Run one successful generate, one validation failure, one authentication failure, one timeout followed by a document lookup, one duplicate submission, one status lookup, and one cancellation. A timeout must look up the document before any retry.
8. Store an IRN or e-way number only after the response contains the required fields. A mock response is not a provider response.
9. Official authentication encrypts the base64 credential JSON with the IRP public key. This client does not do that encryption yet, so a live sandbox call is not certified even when the flag is set.
10. Production onboarding still needs the sandbox test report, up to four Indian static IPs, and explicit enablement. This task does not enable production.

Official references:

- IRP attribute map: https://einv-apisandbox.nic.in/Mapping_of_technical_and_JSONattribute_names_for_IRN.html
- IRP authentication: https://einv-apisandbox.nic.in/version1.04/authentication.html
- Sandbox endpoints: https://einv-apisandbox.nic.in/einvapiclient/EncDesc/ApiEndsPoint.aspx
- E-way bill generate v1.03: https://docs.ewaybillgst.gov.in/apidocs/version1.03/generate-eway-bill.html
- Onboarding: https://einv-apisandbox.nic.in/onboarding.html
