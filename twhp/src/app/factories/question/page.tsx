import { promises as fs } from 'fs';
import path from 'path';
import QuestionPageClient from './QuestionPageClient';

interface Question {
    "0": string;
    "1": string;
    "2": string;
    "3": string;
    type: string;
    no: string;
    question: string;
    "N/A": string;
}

export default async function QuestionPage() {
    const filePath = path.join(process.cwd(), 'public', 'data', 'question.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const questions: Question[] = JSON.parse(fileContents);

    return <QuestionPageClient questions={questions} />;
}
