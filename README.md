# TNO map

YAPms처럼 선거구를 칠해 보는 한국어 선거 지도 시뮬레이터 (TNO 테마).

## 폴더 구조

```
index.html            화면 뼈대
css/style.css         TNO 테마 (색·창 모양)
js/
  util.js             공통 도구 (색 계산, 알림, 확인창)
  maps.js             지도 불러오기 (maps 폴더 읽기)
  store.js            저장 · 저장 코드
  chart.js            의회 구성 차트 (반원 · 막대)
  president.js        대통령 선거 화면 (후보 · 선거인단 막대 · 주별 목록)
  editor.js           칠하기 · 분할 · 비활성 · 잠금 · 되돌리기 · 확대
  parties.js          정당 묶음(내지·조선·대만) · 출마 지역 제한 · 정당 관리 창
  options.js          옵션 (지도 숫자 · 글자 크기·색 · 경계선 · 말풍선 · 차트 강도 · 지도 잠금)
  labels.js           지도 위 숫자 (의석수 · 미국은 주 약자)
  tools.js            표 편집 · 발표 모드
  custom.js           내 지도 (SVG 올려서 칠하기, 브라우저에 저장)
  colorpicker.js      색 고르기 (스포이드 · 이미지에서 · 지도에서)
  export.js           내보내기 (SVG · JSON · PNG) · JSON 불러오기
  app.js              지도 선택 화면 · 시작
maps/
  index.json          지도 목록
  tno-japan/          일본제국 중선거구 지도
    map.svg           선거구 모양
    map.json          지도 이름 · 보기 · 의석수 · 한국어 이름 · 기본 정당
  syria-1952/         시리아 의회 선거 (1952년 10개 주, 1954년 총선 142석 기준)
  tno-usa/            미국 대통령 선거 (1960년 인구조사 선거인단, 537표 · 269표 당선)
```

## 새 지도 넣는 법

1. `maps/` 안에 새 폴더를 만들어요. 예: `maps/tno-germany/`
2. 그 안에 `map.svg`를 넣어요. 선거구마다 `<path id="선거구ID" data-region="지역" d="..."/>` 모양이면 돼요.
3. `map.json`을 만들어요. `maps/tno-japan/map.json`을 복사해서 이름·보기·의석수만 바꾸면 돼요.
4. `maps/index.json`의 `maps` 목록에 `{"id": "tno-germany", "folder": "tno-germany"}` 한 줄을 추가해요.

그러면 지도 선택 화면에 자동으로 나타나요.

`map.json`에 `"layout": "presidential"`을 넣으면 미국처럼 대통령 선거 화면(후보 두 명 · 당선선 막대 · 주별 목록)으로 열려요.

## GitHub Pages

Settings → Pages → Branch `main`, 폴더 `/ (root)` → Save

## YAPms에서 가져온 기능

- 칠하기 단계 순환(확정→유력→우세→경합우세), 분할·비활성·잠금 모드
- 지도 위 숫자, 옵션 창, 반원·막대·원 차트
- 표 편집(도구), 발표 모드, 내 지도(Custom SVG)
