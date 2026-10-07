import os
paths = [
 "cac-calculator/package.json",
 "cac-calculator/.env.example",
 "cac-calculator/server.js",
 "cac-calculator/backend/config/channels.js",
 "cac-calculator/backend/services/cacEngine.js",
 "cac-calculator/backend/services/reportBuilder.js",
 "cac-calculator/backend/services/pdfExport.js",
 "cac-calculator/backend/services/wordExport.js",
 "cac-calculator/backend/services/chartVector.js",
 "cac-calculator/backend/middleware/validate.js",
 "cac-calculator/backend/middleware/rateLimit.js",
 "cac-calculator/backend/routes/api.js",
 "cac-calculator/public/index.html",
 "cac-calculator/public/css/styles.css",
 "cac-calculator/public/js/app.js",
]
for p in paths:
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "a").close()
print("✅ Done")