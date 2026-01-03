/**
 * Vietnam-specific Data Constants for Bus Booking System
 * 
 * Contains authentic Vietnamese:
 * - Names (first/last names)
 * - Cities (all 63 provinces/municipalities) 
 * - Bus operators
 * - Bus stations
 * - Phone number formats
 * - Documentation patterns
 */

export interface VietnamSeedData {
  names: {
    firstNames: string[];
    lastNames: string[];
    fullNames: string[];
  };
  cities: {
    major: string[];
    provinces: string[];
    all: string[];
  };
  busStations: {
    [city: string]: string[];
  };
  operators: {
    name: string;
    contactEmail: string;
    domains: string;
  }[];
  busModels: {
    brand: string;
    model: string;
    capacity: number;
    type: 'standard' | 'limousine' | 'sleeper' | 'seater' | 'vip' | 'business';
  }[];
  phoneFormats: string[];
  plateNumberFormats: string[];
}

export function seedVietnamData(): VietnamSeedData {
  return {
    names: {
      firstNames: [
        // Male names
        'Văn Hùng', 'Minh Tuấn', 'Quang Dũng', 'Đức Anh', 'Hoàng Nam',
        'Thanh Sơn', 'Công Minh', 'Bảo Khang', 'Trung Kiên', 'Việt Anh',
        'Xuân Phúc', 'Hải Đăng', 'Duy Khánh', 'Ngọc Tú', 'Phú Thịnh',
        'Tấn Dũng', 'Gia Huy', 'Quốc Bảo', 'Thành Đạt', 'An Khang',
        'Văn Phong', 'Minh Khôi', 'Tuấn Anh', 'Đăng Khoa', 'Hữu Nghĩa',
        
        // Female names
        'Thị Hoa', 'Thu Hà', 'Minh Châu', 'Ngọc Lan', 'Thanh Mai',
        'Phương Thảo', 'Kim Ngân', 'Bích Phương', 'Thúy Kiều', 'Hồng Nhung',
        'Xuân Trang', 'Thu Hương', 'Minh Thư', 'Ngọc Ánh', 'Phương Linh',
        'Thị Nga', 'Thu Trang', 'Bảo Châu', 'Khánh Ly', 'Diễm My',
        'Văn Linh', 'Thu Phương', 'Ngọc Diệp', 'Thanh Thúy', 'Hải Yến'
      ],
      lastNames: [
        'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Huỳnh', 'Hoàng', 'Phan', 'Vũ', 'Võ', 'Đặng',
        'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Tạ', 'Trịnh', 'Nông',
        'Tô', 'Đoàn', 'Cao', 'Lương', 'Kiều', 'Mai', 'Lam', 'Thái', 'La', 'Bạch',
        'Hà', 'Trương', 'Thạch', 'Thiều', 'Ông', 'Chu', 'Cù', 'Quách', 'Từ', 'Diệp'
      ],
      fullNames: [] // Will be generated dynamically
    },

    cities: {
      major: [
        'Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Biên Hòa', 'Huế',
        'Nha Trang', 'Buôn Ma Thuột', 'Vũng Tàu', 'Quy Nhon', 'Thủ Dầu Một', 'Nam Định',
        'Phan Thiết', 'Long Xuyên', 'Hạ Long', 'Thái Nguyên', 'Thanh Hóa', 'Rạch Giá',
        'Cà Mau', 'Vinh', 'Mỹ Tho', 'Tây Ninh', 'Sóc Trăng', 'Kon Tum', 'Hội An',
        'Sapa', 'Đà Lạt', 'Phú Quốc', 'Bạc Liêu'
      ],
      provinces: [
        'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu', 'Bắc Ninh',
        'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước', 'Bình Thuận', 'Cà Mau',
        'Cần Thơ', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp',
        'Gia Lai', 'Hà Giang', 'Hà Nam', 'Hà Nội', 'Hà Tĩnh', 'Hải Dương', 'Hải Phòng',
        'Hậu Giang', 'Hòa Bình', 'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum',
        'Lai Châu', 'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định', 'Nghệ An',
        'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên', 'Quảng Bình', 'Quảng Nam',
        'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sóc Trăng', 'Sơn La', 'Tây Ninh',
        'Thái Bình', 'Thái Nguyên', 'Thanh Hóa', 'Thừa Thiên Huế', 'Tiền Giang',
        'TP. Hồ Chí Minh', 'Trà Vinh', 'Tuyên Quang', 'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái'
      ],
      all: [] // Will be populated with major + provinces
    },

    busStations: {
      'Hồ Chí Minh': [
        'Bến xe Miền Đông', 'Bến xe Miền Tây', 'Bến xe An Sương', 'Sân bay Tân Sơn Nhất',
        'Đại lộ Đông Tây', 'Bến xe Chợ Lớn', 'Ga Sài Gòn', 'Bến xe Củ Chi', 'Bến xe Cần Giuộc'
      ],
      'Hà Nội': [
        'Bến xe Mỹ Đình', 'Bến xe Giáp Bát', 'Bến xe Nước Ngầm', 'Aeon Long Biên Stop',
        'Sân bay Nội Bài', 'Ga Hà Nội', 'Bến xe Yên Nghĩa', 'Bến xe Gia Lâm', 'Times City'
      ],
      'Đà Nẵng': [
        'Bến xe Trung tâm Đà Nẵng', 'Sân bay Đà Nẵng', 'Ga Đà Nẵng', 'Bến xe Hội An',
        'Con Market', 'Big C Đà Nẵng', 'Lotte Mart Đà Nẵng'
      ],
      'Cần Thơ': [
        'Bến xe Trung tâm Cần Thơ', 'Sân bay Cần Thơ', 'Bến xe Hưng Thạnh', 'Cầu Cần Thơ',
        'Big C Cần Thơ', 'Vincom Plaza Xuân Khánh'
      ],
      'Nha Trang': [
        'Bến xe Nha Trang', 'Sân bay Cam Ranh', 'Ga Nha Trang', 'Trung tâm thành phố',
        'Vinpearland', 'Lotte Mart Nha Trang'
      ],
      'Huế': [
        'Bến xe An Cựu', 'Bến xe An Hòa', 'Ga Huế', 'Sân bay Phú Bài',
        'Đại Nội Huế', 'Big C Huế'
      ],
      'Đà Lạt': [
        'Bến xe Đà Lạt', 'Sân bay Liên Khương', 'Chợ Đà Lạt', 'Hồ Xuân Hương',
        'Ga Đà Lạt cũ', 'Big C Đà Lạt'
      ]
    },

    operators: [
      { name: 'Phương Trang', contactEmail: 'info@phuongtrang.vn', domains: 'phuongtrang.vn' },
      { name: 'Mai Linh Express', contactEmail: 'booking@mailinh.vn', domains: 'mailinh.vn' },
      { name: 'Thành Bưởi', contactEmail: 'support@thanhbuoi.com', domains: 'thanhbuoi.com' },
      { name: 'Hoàng Long', contactEmail: 'lienhe@hoanglong.com.vn', domains: 'hoanglong.com.vn' },
      { name: 'Sinh Tourist', contactEmail: 'booking@thesinhtourist.vn', domains: 'thesinhtourist.vn' },
      { name: 'Hùng Cường', contactEmail: 'info@hungcuong.vn', domains: 'hungcuong.vn' },
      { name: 'Thanh Nga', contactEmail: 'thanhnga@gmail.com', domains: 'thanhngabus.com' },
      { name: 'Hoàng Gia', contactEmail: 'info@hoanggiabus.vn', domains: 'hoanggiabus.vn' },
      { name: 'Minh Tân', contactEmail: 'booking@minhtan.com.vn', domains: 'minhtan.com.vn' },
      { name: 'Sao Việt', contactEmail: 'saoviet@busline.vn', domains: 'busline.vn' },
      { name: 'Nam Sài Gòn', contactEmail: 'namsaigon@express.vn', domains: 'namsaigonexpress.vn' },
      { name: 'Cúc Tùng', contactEmail: 'cuctung@buslines.vn', domains: 'cuctung.vn' },
      { name: 'Tâm Hạnh', contactEmail: 'tamhanh@travel.vn', domains: 'tamhanhtravel.vn' },
      { name: 'Bảo Anh', contactEmail: 'baoanh@transport.vn', domains: 'baoanhtransport.vn' },
      { name: 'Minh Quốc', contactEmail: 'minhquoc@buslines.com', domains: 'minhquocbus.com' }
    ],

    busModels: [
      { brand: 'Hyundai', model: 'Universe K380', capacity: 45, type: 'standard' },
      { brand: 'Thaco', model: 'TB79S Mobihome', capacity: 22, type: 'sleeper' },
      { brand: 'Mercedes-Benz', model: 'O500 RS 1836', capacity: 47, type: 'business' },
      { brand: 'Samco', model: 'Felix Ci 29', capacity: 29, type: 'vip' },
      { brand: 'Daewoo', model: 'FX120', capacity: 45, type: 'standard' },
      { brand: 'Hino', model: 'AK8JRSA', capacity: 25, type: 'seater' },
      { brand: 'Isuzu', model: 'Samco Felix', capacity: 34, type: 'limousine' },
      { brand: 'King Long', model: 'XMQ6127C', capacity: 49, type: 'standard' },
      { brand: 'Yutong', model: 'ZK6122HGA9', capacity: 53, type: 'business' },
      { brand: 'Golden Dragon', model: 'XML6127J18W', capacity: 39, type: 'vip' },
      { brand: 'Scania', model: 'Touring K410IB', capacity: 28, type: 'sleeper' },
      { brand: 'MAN', model: 'Lion´s Coach R08', capacity: 55, type: 'standard' },
      { brand: 'Volvo', model: '9700 Grand L', capacity: 31, type: 'limousine' },
      { brand: 'Iveco', model: 'Magelys Pro', capacity: 42, type: 'seater' },
      { brand: 'Temsa', model: 'Safari RD', capacity: 36, type: 'business' }
    ],

    phoneFormats: [
      '03', '05', '07', '08', '09' // Vietnamese mobile prefixes
    ],

    plateNumberFormats: [
      // Vietnamese license plate formats by region
      '29B', '30B', '31B', '32B', // Hà Nội area
      '51B', '52B', '53B', '54B', // TP. Hồ Chí Minh area  
      '43B', '44B', '45B', '46B', // Đà Nẵng area
      '15B', '16B', '17B', '18B', // Hải Phòng area
      '65B', '66B', '67B', '68B', // Cần Thơ area
      '47B', '48B', '49B', // Huế area
      '79B', '80B', '81B', // Nha Trang area
      '50B', '60B', '61B', '62B', '63B', '64B', // Other major areas
    ]
  };
}

export function generateVietnameseFullName(data: VietnamSeedData): string {
  const lastName = data.names.lastNames[Math.floor(Math.random() * data.names.lastNames.length)];
  const firstName = data.names.firstNames[Math.floor(Math.random() * data.names.firstNames.length)];
  return `${lastName} ${firstName}`;
}

export function generateVietnamesePhoneNumber(data: VietnamSeedData): string {
  const prefix = data.phoneFormats[Math.floor(Math.random() * data.phoneFormats.length)];
  const number = Math.floor(Math.random() * 90000000) + 10000000; // 8-digit number
  return `+84${prefix}${number.toString()}`;
}

export function generateVietnamPlateNumber(data: VietnamSeedData): string {
  const prefix = data.plateNumberFormats[Math.floor(Math.random() * data.plateNumberFormats.length)];
  const number = Math.floor(Math.random() * 900) + 100; // 3-digit number
  const suffix = Math.floor(Math.random() * 90) + 10; // 2-digit suffix
  return `${prefix}-${number}.${suffix}`;
}

export function generateBookingReference(): string {
  const prefix = 'BK';
  const date = new Date();
  const dateStr = date.getFullYear().toString() + 
                  (date.getMonth() + 1).toString().padStart(2, '0') + 
                  date.getDate().toString().padStart(2, '0');
  
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomPart = Array.from({ length: 6 }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  
  return `${prefix}${dateStr}-${randomPart}`;
}

export function generatePayOSOrderCode(): number {
  // PayOS order codes are typically 6-8 digits
  return Math.floor(Math.random() * 90000000) + 10000000;
}

// Populate combined city list
export function initializeVietnamData(): VietnamSeedData {
  const data = seedVietnamData();
  data.cities.all = [...new Set([...data.cities.major, ...data.cities.provinces])];
  
  // Generate full names combinations
  for (let i = 0; i < 200; i++) {
    data.names.fullNames.push(generateVietnameseFullName(data));
  }
  
  return data;
}