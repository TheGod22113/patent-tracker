@echo off
cd /d "C:\Users\mobil\OneDrive\Desktop\patent-tracker"
if defined PORT (
    npx next dev --port %PORT%
) else (
    npm run dev
)
