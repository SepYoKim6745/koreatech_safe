from openai import OpenAI

client = OpenAI(base_url='http://127.0.0.1:8000/v1', api_key='EMPTY')

msg = [
    {
        'role': 'user',
        'content': [
            {'type': 'text', 'text': '이 사진 속에서 위험요소를 찾아주고 개선방안도 알려줘.'},
            {'type': 'image_url', 'image_url': {'url': 'https://cdn.outsourcing.co.kr/news/photo/201906/85102_23368_715.jpg'}}
        ]
     }
]

res = client.chat.completions.create(
    model='Qwen/Qwen2.5-VL-7B-Instruct',
    messages=msg,
    temperature=0.2
)

print(res.choices[0].message.content)