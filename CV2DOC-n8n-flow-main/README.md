# CV2DOC n8n flow

### This repository contains:

* [**`cv2doc` package**](./cv2doc/) — a simple Python package that:

  * accepts a path to a CV in **PDF format**
  * sends it to an AI service for analysis
  * generates a structured document based on a predefined template

* [**API endpoint**](./endpoint/) — accepts a file upload and forwards it to `cv2doc`.

The endpoint is designed to run alongside **n8n** in Docker and act as a node inside an n8n workflow.

**User → n8n Flow → Custom Endpoint → `cv2doc` → AI → Generated Document → user**


## Running the Project

Create a `.env` file based on the provided template:

```bash
cp .env.template .env
```

Obtain a [Google API](https://ai.google.dev/gemini-api/docs/api-key?authuser=2&hl=fr) key and place it in the `.env` file:

```
AI_API_KEY=your_key_here
```

Run Docker Compose:

```bash
docker compose up -d 
```

Navigate to http://localhost:5678

In the n8n interface, create a new flow. 
Then import a n8n flow from the file: [n8n_workflows/CV.pdf → Dossier_de_compétences.docx  (fastAPI flow).json](./n8n_workflows/CV.pdf%20→%20Dossier_de_compétences.docx%20%20(fastAPI%20flow).json)

**Important:** After importing, **activate** the workflow (toggle **Active** in the top right). The form URL is only available when the workflow is active.

## Execute the Flow

1. **Use the Form URL**  
   Open the **Production URL** (or **Test URL**) shown in the **On form submission** (Form Trigger) node. Open it in your browser with a normal navigation (GET). Do not call this URL with POST only — the form page is served with GET, and the submission uses POST.
2. Upload a CV in **PDF format**.
3. The workflow returns a generated document based on the template.

## Troubleshooting: "Method not allowed"

If you see **"Method not allowed - please check you are using the right HTTP method"**:

1. **Activate the workflow**  
   The workflow is imported with **Active** off. Turn **Active** on (top right), then save. The Form Trigger registers both GET (to display the form) and POST (to submit). If the workflow is inactive, the form URL may not work or may only accept one method.

2. **Use the correct URL**  
   Use the **Form URL** displayed in the Form Trigger node (Production URL or Test URL). Open it in the browser by pasting the URL in the address bar (GET). Do not use the general n8n URL (`http://localhost:5678`) or an API path that expects only POST.

3. **Reverse proxy**  
   If n8n is behind Nginx or another proxy, ensure the form path allows **GET** and **POST**. Some proxies block GET on webhook paths and cause 405.

---

## Direct Package Usage

If you want to use `cv2doc` without n8n, refer to its dedicated [README](./cv2doc/README.md)
