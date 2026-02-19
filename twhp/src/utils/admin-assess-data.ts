export type AssessmentStatus = 'not_started' | 'pending' | 'assessed';

export interface AssessmentFactory {
    id: string;
    sequence: number;
    name: string;
    province: string;
    selfScore?: number; // 0-100, optional if not started
    healthCenterScore?: number;
    mentalHealthScore?: number;
    ddcScore?: number; // Main score (41 items)
    totalScore?: number; // Used for Shield Level
    status: AssessmentStatus;
    submittedDate?: string;
    consecutiveYears?: 3 | 6 | 9; // New field for Gold Shield variations
}

export const MOCK_FACTORIES: AssessmentFactory[] = [
    { id: 'F007', sequence: 4, name: 'บริษัท ยังไม่ได้เริ่ม จำกัด', province: 'เชียงใหม่', status: 'not_started' },
    { id: 'F008', sequence: 5, name: 'บริษัท รอประเมินตนเอง จำกัด', province: 'ขอนแก่น', status: 'not_started' },
    { id: 'F001', sequence: 1, name: 'บริษัท ไทยยูเนี่ยน กรุ๊ป จำกัด (มหาชน)', province: 'สมุทรสาคร', selfScore: 95.5, status: 'pending', submittedDate: '2024-01-15' },
    { id: 'F002', sequence: 2, name: 'บริษัท ซีพี ออลล์ จำกัด (มหาชน)', province: 'กรุงเทพมหานคร', selfScore: 92.0, status: 'pending', submittedDate: '2024-01-16' },
    { id: 'F003', sequence: 3, name: 'บริษัท ปตท. จำกัด (มหาชน)', province: 'ระยอง', selfScore: 88.5, status: 'pending', submittedDate: '2024-01-18' },
    { id: 'F004', sequence: 1, name: 'บริษัท โตโยต้า มอเตอร์ ประเทศไทย จำกัด', province: 'ฉะเชิงเทรา', selfScore: 98.0, healthCenterScore: 88, mentalHealthScore: 92, ddcScore: 96.5, totalScore: 96.5, status: 'assessed', submittedDate: '2024-01-10' },
    { id: 'F005', sequence: 2, name: 'บริษัท ปูนซิเมนต์ไทย จำกัด (มหาชน)', province: 'สระบุรี', selfScore: 85.0, healthCenterScore: 82, mentalHealthScore: 85, ddcScore: 84, totalScore: 84, status: 'assessed', submittedDate: '2024-01-12' },
    { id: 'F006', sequence: 3, name: 'บริษัท แอดวานซ์ อินโฟร์ เซอร์วิส จำกัด (มหาชน)', province: 'กรุงเทพมหานคร', selfScore: 78.0, healthCenterScore: 75, mentalHealthScore: 80, ddcScore: 72, totalScore: 72, status: 'assessed', submittedDate: '2024-01-11' },
    { id: 'F009', sequence: 4, name: 'บริษัท ทดสอบ จำกัด', province: 'เชียงราย', selfScore: 55.0, healthCenterScore: 60, mentalHealthScore: 55, ddcScore: 58, totalScore: 58, status: 'assessed', submittedDate: '2024-01-20' },
    { id: 'F010', sequence: 5, name: 'บริษัท ดีเยี่ยม 3 ปี จำกัด', province: 'ภูเก็ต', selfScore: 99.0, healthCenterScore: 95, mentalHealthScore: 98, ddcScore: 99, totalScore: 99, status: 'assessed', submittedDate: '2024-01-22', consecutiveYears: 3 },
    { id: 'F011', sequence: 6, name: 'บริษัท สุดยอด 6 ปี จำกัด', province: 'เชียงใหม่', selfScore: 99.0, healthCenterScore: 96, mentalHealthScore: 97, ddcScore: 99, totalScore: 99, status: 'assessed', submittedDate: '2024-01-23', consecutiveYears: 6 },
    { id: 'F012', sequence: 7, name: 'บริษัท ตำนาน 9 ปี จำกัด', province: 'กรุงเทพมหานคร', selfScore: 99.0, healthCenterScore: 99, mentalHealthScore: 99, ddcScore: 99, totalScore: 99, status: 'assessed', submittedDate: '2024-01-24', consecutiveYears: 9 },
];
