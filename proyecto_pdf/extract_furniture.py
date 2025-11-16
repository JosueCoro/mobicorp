import os
from dotenv import load_dotenv
from PyPDF2 import PdfReader, PdfWriter
from openai import OpenAI
import json

# Cargar variables de entorno
load_dotenv()

# Inicializar cliente de OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def extract_text_from_pdf(pdf_path):
    """Extrae texto de todas las páginas del PDF"""
    reader = PdfReader(pdf_path)
    pages_content = []

    for page_num, page in enumerate(reader.pages):
        text = page.extract_text()
        pages_content.append({"page": page_num + 1, "text": text})

    return pages_content, reader


def analyze_with_openai(pages_content):
    """Usa OpenAI para identificar la página con muebles de oficina"""

    # Crear un resumen de todas las páginas
    pages_summary = "\n---\n".join(
        [
            f"Página {page['page']}:\n{page['text'][:500]}"  # Primeros 500 caracteres
            for page in pages_content
        ]
    )

    prompt = f"""Analiza el siguiente contenido de un catálogo PDF y encuentra la página que hable de MUEBLES DE OFICINA.

Si hay varias páginas sobre muebles de oficina, selecciona SOLO UNA (preferiblemente la que tenga más contenido sobre muebles).

Debes responder en JSON con este formato:
{{
    "page_number": <número de página>,
    "category": "<categoría encontrada>",
    "description": "<breve descripción del contenido>"
}}

Contenido del PDF:
{pages_summary}"""

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {
                "role": "system",
                "content": "Eres un asistente especializado en analizar catálogos PDF. Debes identificar páginas sobre muebles de oficina.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.5,
    )

    result_text = response.choices[0].message.content

    # Parsear respuesta JSON
    try:
        result = json.loads(result_text)
    except json.JSONDecodeError:
        # Si no es JSON válido, intentar extraer el número de página manualmente
        import re

        match = re.search(r'"page_number":\s*(\d+)', result_text)
        if match:
            page_num = int(match.group(1))
            result = {
                "page_number": page_num,
                "category": "Muebles",
                "description": result_text,
            }
        else:
            result = {
                "page_number": 1,
                "category": "Muebles",
                "description": result_text,
            }

    return result


def extract_page_to_pdf(input_pdf_path, page_number, output_pdf_path):
    """Extrae una página específica del PDF y la guarda en un nuevo archivo"""

    reader = PdfReader(input_pdf_path)
    writer = PdfWriter()

    # Restar 1 porque las listas de Python comienzan en 0
    page_index = page_number - 1

    if 0 <= page_index < len(reader.pages):
        page = reader.pages[page_index]
        writer.add_page(page)

        with open(output_pdf_path, "wb") as output_file:
            writer.write(output_file)

        return True
    else:
        print(f"Error: La página {page_number} no existe en el PDF")
        return False


def main():
    # Rutas
    input_pdf = r"c:\Users\LEAVIN CORO\Documents\mobicorp2\pdf\CATALOGO DE SILLAS GIRATORIAS..pdf"
    output_pdf = r"c:\Users\LEAVIN CORO\Documents\mobicorp2\proyecto_pdf\muebles_oficina_extraido.pdf"

    print("📖 Extrayendo texto del PDF...")
    pages_content, reader = extract_text_from_pdf(input_pdf)
    print(f"✅ Se encontraron {len(pages_content)} páginas")

    print("\n🤖 Analizando con OpenAI para encontrar página de muebles...")
    result = analyze_with_openai(pages_content)

    page_number = result.get("page_number", 1)
    print(f"\n📍 Página encontrada: {page_number}")
    print(f"📌 Categoría: {result.get('category', 'No especificada')}")
    print(f"📝 Descripción: {result.get('description', 'No disponible')}")

    print(f"\n📥 Extrayendo página {page_number} a nuevo PDF...")
    if extract_page_to_pdf(input_pdf, page_number, output_pdf):
        print(f"✅ ¡Listo! Archivo guardado en:\n{output_pdf}")
    else:
        print("❌ Error al extraer la página")


if __name__ == "__main__":
    main()
