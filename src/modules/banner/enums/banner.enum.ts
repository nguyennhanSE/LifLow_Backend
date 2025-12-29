export enum EBannerType {
    MAIN_PRODUCTS = 'MAIN_PRODUCTS',      // Main Products (메인 상품)
    CATEGORY = 'CATEGORY',          // Category (카테고리)
    FOOTER = 'FOOTER',            // Footer
    CONTENT_HERO = 'CONTENT_HERO',      // Content Hero
    SPECIAL_PRICE = 'SPECIAL_PRICE',     // This week's special price (이번주 특가)
}
export enum EBannerStatus {
    ACTIVE = 'ACTIVE',   // 활성화
    INACTIVE = 'INACTIVE', // 비활성화
    SCHEDULED = 'SCHEDULED', // 예약됨
}
export enum ECategoryType {
    ALL = 'ALL', // 모든 배너
    LIVESTOCK = 'LIVESTOCK', // 라이브스톡
    CONVENIENCE_FOOD = 'CONVENIENCE_FOOD', // 편의점 음식
    FISHERIES = 'FISHERIES', // 수산물
    SIDE_DISH = 'SIDE_DISH', // 사이드 요리
}