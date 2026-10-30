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
  editor.js           칠하기 · 분할 · 비활성 · 잠금 · 되돌리기 · 확대
  export.js           지도 이미지 만들기
  app.js              지도 선택 화면 · 시작
maps/
  index.json          지도 목록
  tno-japan/          일본제국 중선거구 지도
    map.svg           선거구 모양
    map.json          지도 이름 · 보기 · 의석수 · 한국어 이름 · 기본 정당
```

## 새 지도 넣는 법

1. `maps/` 안에 새 폴더를 만들어요. 예: `maps/tno-germany/`
2. 그 안에 `map.svg`를 넣어요. 선거구마다 `<path id="선거구ID" data-region="지역" d="..."/>` 모양이면 돼요.
3. `map.json`을 만들어요. `maps/tno-japan/map.json`을 복사해서 이름·보기·의석수만 바꾸면 돼요.
4. `maps/index.json`의 `maps` 목록에 `{"id": "tno-germany", "folder": "tno-germany"}` 한 줄을 추가해요.

그러면 지도 선택 화면에 자동으로 나타나요.

## GitHub Pages

Settings → Pages → Branch `main`, 폴더 `/ (root)` → Save
