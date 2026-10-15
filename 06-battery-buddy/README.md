# 06 · 배터리 친구 (battery-buddy)

> hachan-lab 6일차. 윈도우 시계 옆(트레이)에 사는 캐릭터. 배터리가 줄면 표정이 변하고, 20% 아래면 운다.

## 받기

[Releases](https://github.com/seinShin/hachan-lab/releases)에서 `BatteryBuddy.exe`를 받아 실행. 설치 없음, 37KB.

처음 실행하면 **"Windows의 PC 보호"** 경고가 뜬다 (코드 서명 인증서가 없어서). **추가 정보 → 실행**을 누르면 된다.

트레이 아이콘이 안 보이면 시계 옆 `^`를 눌러 숨은 아이콘에서 찾고, 작업 표시줄로 끌어다 놓으면 항상 보인다.

## 표정

| 배터리 | 표정 | 한마디 |
|---|---|---|
| 80% 이상 | 😄 | 기분 최고! 뭐든 할 수 있어 |
| 50% 이상 | 🙂 | 아직 괜찮아요 :) |
| 20% 이상 | 😟 | 슬슬 불안해지는데… |
| 20% 미만 | 😭 눈물이 흐름 | 살려줘… 충전기 주세요 + 알림 한 번 |
| 충전 중 | 😋⚡ | 냠냠, 전기 먹는 중 |
| 배터리 없는 PC | 😑 | 쿨쿨… |

- 아이콘 왼쪽 클릭: 큰 얼굴 + 배터리 막대 창
- 오른쪽 클릭: 윈도우 시작할 때 같이 켜기 / 종료

## 빌드

```powershell
cd C:\sein\hachan-lab\06-battery-buddy
.\build.cmd          # → dist\BatteryBuddy.exe
```

윈도우에 기본으로 있는 C# 컴파일러(`csc.exe`, .NET Framework 4)만 쓴다. npm·설치 필요 없음.
이 컴파일러는 C# 5까지만 지원해서 `$"..."`, `?.` 같은 최신 문법은 쓰지 않았다.

## 테스트

```powershell
dist\BatteryBuddy.exe --pct 15              # 15%로 가정 → 우는 얼굴
dist\BatteryBuddy.exe --pct 90 --charging   # 충전 중
dist\BatteryBuddy.exe --preview faces.png   # 표정 전부 이미지 한 장으로
```

## 구조

```
BatteryBuddy.cs   프로그램 전체
  Status          배터리 읽기 → 표정 고르기 (SystemInformation.PowerStatus)
  Face            얼굴 그리기 (64×64 기준으로 그리고 크기에 맞춰 줄임)
  Popup           아이콘 클릭하면 뜨는 작은 창
  Startup         시작 프로그램 등록 (레지스트리 HKCU\...\Run)
  BuddyApp        트레이 아이콘, 0.6초마다 갱신, 20% 알림
build.cmd         빌드 (아이콘 .ico도 프로그램이 직접 그려서 만든다)
```

`build.cmd`는 줄바꿈이 CRLF여야 실행된다. 저장소 `.gitattributes`에 `*.cmd text eol=crlf`로 지정해 둠.
