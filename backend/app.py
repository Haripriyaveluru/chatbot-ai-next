from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app,origins=["http://localhost:3000","https://chatbot-ai-next-haripriya.vercel.app/"])

# Configure Gemini AI
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-1.5-flash')

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        print(data, "receiveddata")
        message = data.get('message')
        
        if not message:
            return jsonify({'error': 'No message provided'}), 400

        # Add detailed logging
        print(f"Sending message to Gemini: {message}")
        
        # Generate response using Gemini AI
        try:
            response = model.generate_content(message)
            return jsonify({
                'response': response.text
            })
        except Exception as gemini_error:
            print(f"Gemini API error: {gemini_error}")
            return jsonify({'error': f'Gemini API error: {str(gemini_error)}'}), 500
            
    except Exception as e:
        print(f"Server error: {e}")
        import traceback
        traceback.print_exc()  # This will print the full stack trace
        return jsonify({'error': str(e)}), 500
    
if __name__ == '__main__':
    app.run(debug=True)