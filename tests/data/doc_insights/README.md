# Document Insights Sample Fixtures

Store curated sample documents here so the prototype API and demo UI can run without network calls.

Recommended structure:

```
tests/data/doc_insights/
  invoices/
    sample_invoice_001.pdf
  cheques/
    sample_cheque_001.jpg
  kyc/
    pan/
      pan_masked_sample.png
    aadhaar/
      aadhaar_offline_sample.pdf
```

## Suggested Sources

- **Invoices** – [Sample PDF Invoices (github.com/femstac)](https://github.com/femstac/Sample-Pdf-invoices) – zip bundle based on Tableau Global Superstore data. Attribution covered by repository licence.
- **Cheques** – [IDRBT Cheque Image Dataset](https://www.idrbt.ac.in/idrbt-cheque-image-dataset/) – 112 annotated Indian cheques including forged samples.
- **PAN Cards** – [Pixabay PAN card vector](https://pixabay.com/illustrations/pan-card-india-income-tax-pan-tax-7579594/) – royalty-free asset for mockups, mask sensitive data before demos.
- **Aadhaar** – [UIDAI offline e-KYC sample](https://uidai.gov.in/gu/2-uncategorised/11319-aadhaar-paperless-offline-e-kyc-2.html) – includes example zip + instructions to generate masked files legally.

Add provenance notes or consent letters alongside each file if they are required for management presentations.
