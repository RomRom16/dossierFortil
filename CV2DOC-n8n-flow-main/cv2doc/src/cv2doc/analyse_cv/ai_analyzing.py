from typing import Any
from pathlib import Path
from langchain_google_genai import ChatGoogleGenerativeAI
from datetime import date

from cv2doc.analyse_cv.models import CVSchema
from langchain_core.messages import SystemMessage, HumanMessage

def analyze_img(image_data, settings):

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash", 
        temperature=0,
        api_key=settings.ai_api_key.get_secret_value()
    )

    structured_llm = llm.with_structured_output(schema=CVSchema)

    human_message_content: list[dict[str, Any]] = []

    for img_url in image_data:
        human_message_content.append({
            "type": "image_url",
            "image_url": {"url": img_url}
        })

    prompt_template = Path(settings.prompt_path).read_text(encoding="utf-8")
    formated_prompt = prompt_template.format(date=date.today().isoformat())
    
    return structured_llm.invoke([
        SystemMessage(content=formated_prompt),
        HumanMessage(content=human_message_content),
    ])
