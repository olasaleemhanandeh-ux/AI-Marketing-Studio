from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from google import genai
from google.genai import types
from openai import OpenAI
import os

load_dotenv()

app = Flask(__name__)

gemini_client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

groq_client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

def ask_gemini(prompt):

    response = gemini_client.models.generate_content(

        model="gemini-2.5-flash",

        contents=prompt,

        config=types.GenerateContentConfig(

            temperature=0.8,

            top_p=0.95

        )

    )

    if not response.text:

        raise Exception("Empty response from Gemini")

    return response.text


def ask_groq(prompt):

    response = groq_client.chat.completions.create(

        model="llama-3.3-70b-versatile",

        messages=[

            {
                "role": "user",
                "content": prompt
            }

        ],
        temperature=0.8,
        top_p=0.95

    )

    text = response.choices[0].message.content

    if not text:

        raise Exception("Empty response from Groq")

    return text


def generate_with_fallback(prompt):

    try:

        print("Using Gemini")

        text = ask_gemini(prompt)

        return {

            "provider": "Gemini",

            "content": text

        }

    except Exception as e:

        print("Gemini failed")
        print(e)

        try:

            print("Using Groq")

            text = ask_groq(prompt)

            return {

                "provider": "Groq",

                "content": text

            }

        except Exception as e:

            print("Groq failed")
            print(e)

            return {

                "provider": "None",

                "content": "Sorry, all AI providers are currently unavailable."

            }


platform_rules = {

    "LinkedIn": """
- Write in a professional and business-oriented style.
- Start with a strong hook.
- Use short paragraphs.
- Focus on value, innovation, and credibility.
- Encourage discussion at the end.
- Use at most 2 relevant emojis.
""",

    "Instagram": """
- Write in a creative and engaging style.
- Use short, punchy sentences.
- Include appropriate emojis throughout the post.
- End with a compelling call to action.
- Add 5–10 relevant hashtags.
""",

    "Facebook": """
- Write in a friendly and conversational tone.
- Tell a short story if appropriate.
- Encourage likes, comments, and shares.
- Use emojis naturally.
""",

    "X": """
- Keep the content concise and impactful.
- Capture attention immediately.
- Stay within the platform character limit.
- Include relevant hashtags.
""",

    "Email": """
- Write a compelling subject line.
- Use a professional email structure.
- End with a strong call to action.
""",

    "Website": """
- Write persuasive website copy.
- Focus on product benefits.
- Use a professional tone.
""",

    "Blog": """
- Write an informative article.
- Include introduction, body, and conclusion.
- Educate the reader naturally.
"""

}

def build_prompt(product_name, description, platform, tone):

    return f"""
You are an expert marketing copywriter with years of experience creating high-converting marketing campaigns.

Your task is to generate professional, engaging, and persuasive marketing content for the product below.

Platform:
{platform}

Tone:
{tone}

Product Name:
{product_name}

Product Description:
{description}

Platform Guidelines:

{platform_rules.get(platform)}

Requirements:

- Write content specifically optimized for the selected platform.
- Match the requested tone naturally.
- Start with a powerful and attention-grabbing opening.
- Avoid clichés and generic introductions.
- Be creative and original.
- Use storytelling when appropriate.
- Clearly explain the product's value and benefits.
- Focus on solving the customer's problems rather than only listing features.
- Create an emotional connection with the reader.
- Keep the writing natural and human-like.
- Use persuasive language without sounding overly promotional.
- End with a strong call to action that encourages engagement or purchase.
- Return ONLY the final marketing content.
- Do NOT include explanations, notes, titles, or markdown.
- The response must be complete and never end with an unfinished sentence.
- Generate approximately 150–250 words.
- Never generate fewer than 150 words.

Writing Style:

- Sound like an experienced human copywriter.
- Use varied sentence lengths.
- Make the first sentence impossible to ignore.
- Make the content memorable and emotionally engaging.
- Ensure every sentence adds value.
- Avoid repeating ideas or words unnecessarily.

Language Requirements:

- Automatically detect the user's language from the Product Name and Product Description.
- Write the entire marketing content using that same language.
- Maintain native-level fluency and natural writing style.
- Never mix Arabic and English unless the product description itself intentionally mixes both languages.
- Preserve brand names exactly as provided.
"""


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/generate", methods=["POST"])
def generate():

    data = request.json

    product_name = data.get("product_name", "").strip()
    description = data.get("description", "").strip()
    platform = data.get("platform", "").strip()
    tone = data.get("tone", "").strip()

    if not all([product_name, description, platform, tone]):

        return jsonify({

            "error": "Please fill in all fields."

        }), 400

    prompt = build_prompt(
        product_name,
        description,
        platform,
        tone
    )

    result = generate_with_fallback(prompt)
    
    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True)