# Installing UMAP Support

To enable UMAP dimensionality reduction in the clustering feature, you need to install the `umap-js` package.

## Installation Steps

1. Open a terminal/command prompt
2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

This will install `umap-js` along with all other dependencies.

## Verifying Installation

After installation:
- Restart the development server if it's running
- Navigate to the clustering page
- Select "UMAP" from the Dimensionality Reduction dropdown
- Click "Run" - you should now see the UMAP visualization

## Note

If you encounter PowerShell execution policy issues on Windows, you can:
1. Use Command Prompt instead of PowerShell, or
2. Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
