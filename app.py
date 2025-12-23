import json
import random

class DataHandler:

    def __init__(self, file='data.json'):
        self.__file = file
        self.data = self.load_data()

    def load_data(self):
        try:
            with open(self.__file, 'r') as f:
                return json.load(f)
        except:
            return {"subjects": []}

    def save_data(self):
        with open(self.__file, 'w') as f:
            json.dump(self.data, f, indent=4)

class Subject:
    def __init__(self, name):
        self.name = name
        self.lessons = []

    def to_dict(self):
        return {
            "name": self.name,
            "lessons": [lesson.to_dict() for lesson in self.lessons]
        }

class Lesson:
    def __init__(self, title, content):
        self.title = title
        self.content = content
        self.quizzes = []

    def to_dict(self):
        return {
            "title": self.title,
            "content": self.content,
            "quizzes": self.quizzes
        }

class Quiz:
    def __init__(self, lesson_content):
        self.lesson_content = lesson_content
        self.questions = []

    def generate_questions(self):
        sentences = [s.strip() for s in self.lesson_content.split('.') if s.strip()]
        for s in sentences[:5]:
            q_type = random.choice(['True/False', 'Multiple Choice'])
            if q_type == 'True/False':
                self.questions.append({
                    "question": f"{s} (True/False)?",
                    "answer": random.choice(["True", "False"])
                })
            else:
                self.questions.append({
                    "question": f"{s} (Multiple Choice)?",
                    "options": [s, "Option A", "Option B", "Option C"],
                    "answer": s
                })
        return self.questions
