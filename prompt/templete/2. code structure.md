다음 기술스택을 참고해, layered architecture와 solid principle을 준수한 codebase structure 제안해주세요.
directory structure, top level building blocks를 포함하세요.

---

사용 기술 스택:
(여기에 사용할 기술 스택을 입력)

반드시 판단 기준을 따르세요.
1. presentation은 반드시 business logic과 분리되어야합니다.
2. pure business logic은 반드시 persistence layer와 분리되어야합니다.
3. internal logic은 반드시 외부연동 contract, caller와 분리되어야합니다.
4. 하나의 모듈은 반드시 하나의 책임을 가져야합니다.