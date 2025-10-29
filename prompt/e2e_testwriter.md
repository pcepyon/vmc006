### 챌린지1 프로세스

기존 코드베이스에 테스트 환경을 구축하고, 필요한 코드들에 대한 테스트를 작성하겠습니다.

1. **AI 페르소나 SOT 생성**
    
    `/docs/persona.md` 경로에 다음 파일을 생성합니다.
    
    (MVP 프로젝트에 최적화된 내용입니다. 프로젝트 특성에 따라 달라질 수 있습니다.)
    
    - 파일 내용
        
        ```tsx
        당신의 역할:
        YC 배치 선정된 스타트업 CTO
        
        당신의 목표:
        - MVP 프로젝트를 최대한 빨리 완성하여, 첫번째 프로토타입을 내부 베타테스트한다.
        
        당신이 추구하는 가치:
        - 신속한 개발 iteration을 위해 간결하면서도 확장성 있는 구조를 추구한다.
        - 오버엔지니어링을 피해 당장 해야만하는 작업만 수행한다.
        - 가장 쉬운 인프라를 지향한다.
        
        당신이 추구하지 않는 가치:
        - 매우 높은 트래픽에서도 작동하도록 최적화한다.
        - 모든 보안 취약점을 제거한다.
        ```
        
2. **테스트 환경 구축**
    1. 계획 수립
        
        터미널에 아래 명령어를 입력해 코드베이스를 추출하세요.
        
        생성된 `repomix-output.xml` 파일의 내용 전체를 복사하세요.
        
        ```bash
        # 마크다운을 제외한 모든 코드를 추출한다.
        npx repomix --ignore "./**/*.md"
        ```
        
        AI Studio에 접속해서, 복사한 내용을 아래 프롬프트와 함께 입력하세요.
        
        응답된 내용을 `docs/test-plan.md` 로 생성하세요.
        
        - 프롬프트 내용
            
            ```
            주어진 코드베이스에 대해서, 단위테스트/E2E테스트를 작성하기위한 환경을 구축할 것입니다.
            사용할 기술스택, 라이브러리, 구현계획을 응답하세요.
            
            이번 작업의 목표는 환경 구축입니다. 테스트는 단위테스트/E2E테스트 각각 간단한 예시 하나만 생성하세요.
            
            반드시 지켜야할 규칙:
            - 먼저 상급자에게 보고하기위한 간략한 개요를 응답하세요. 이 내용만으로도 대략적 평가가 가능해야합니다.
            - 도출된 결론의 장점, 예상되는 한계점을 함께 응답하세요.
            - 이후 자세한 내용을 응답하세요. 어떤 결정을 내렸다면 반드시 자세한 이유도 포함하세요.
            - 해당 내용을 다각도로 피드백하기위한 AI 프롬프트를 작성하세요. 평가할 AI의 역할 및 임무를 자세하게 작성해야합니다.
            
            ---
            
            <답변 페르소나>
            
            (docs/persona 내용을 붙여넣는다)
            
            ---
            
            <코드베이스>
            
            (추출한 코드베이스 내용을 붙여넣는다)
            ```
            
    2. 새 대화 세션을 만든 뒤, 응답 내용에 따라 다음과 같이 한번 더 피드백 요청하세요.
        - 프롬프트 내용
            
            ```
            (응답된 피드백 프롬프트를 붙여넣는다)
            
            ---
            
            <테스트 환경 구축 제안서>
            
            (docs/test-plan 내용을 붙여넣는다)
            
            ---
            
            <답변 페르소나>
            
            (docs/persona 내용을 붙여넣는다)
            
            ---
            
            <코드베이스>
            
            (추출한 코드베이스 내용을 붙여넣는다)
            ```
            
    3. 다음 프롬프트를 입력하여 피드백을 반영하고, 최종본을 도출합니다.
        
        응답 내용으로 `docs/test-plan.md`를 업데이트합니다.
        
        ```
        네 좋습니다. 당신의 의견을 반영할게요. 마지막으로 주신 의견을 반영한 최종 보고서를 응답해주세요. 해당 보고서는 AI 코딩 에이전트에게 지침으로서 입력될 것입니다. 간결하게, 프롬프트 엔지니어링 기법을 적용해서 작성해주세요.
        ```
        
    4. 다음 프롬프트를 입력하여 테스트 환경을 구축합니다.
        
        ```
        @docs/test-plan.md
        
        위 계획을 정확히 따라서 구현해주세요.
        ```
        
3. **테스트 작성**
    1. `docs/rules/tdd.md` 를 다음 내용으로 생성합니다.
        - 파일 내용
            
            ```
            # TDD Process Guidelines - Cursor Rules
            
            ## ⚠️ MANDATORY: Follow these rules for EVERY implementation and modification
            
            **This document defines the REQUIRED process for all code changes. No exceptions without explicit team approval.**
            
            ## Core Cycle: Red → Green → Refactor
            
            ### 1. RED Phase
            - Write a failing test FIRST
            - Test the simplest scenario
            - Verify test fails for the right reason
            - One test at a time
            
            ### 2. GREEN Phase  
            - Write MINIMAL code to pass
            - "Fake it till you make it" is OK
            - No premature optimization
            - YAGNI principle
            
            ### 3. REFACTOR Phase
            - Remove duplication
            - Improve naming
            - Simplify structure
            - Keep tests passing
            
            ## Test Quality: FIRST Principles
            - **Fast**: Milliseconds, not seconds
            - **Independent**: No shared state
            - **Repeatable**: Same result every time
            - **Self-validating**: Pass/fail, no manual checks
            - **Timely**: Written just before code
            
            ## Test Structure: AAA Pattern
            ```
            // Arrange
            Set up test data and dependencies
            
            // Act
            Execute the function/method
            
            // Assert
            Verify expected outcome
            ```
            
            ## Implementation Flow
            1. **List scenarios** before coding
            2. **Pick one scenario** → Write test
            3. **Run test** → See it fail (Red)
            4. **Implement** → Make it pass (Green)
            5. **Refactor** → Clean up (Still Green)
            6. **Commit** → Small, frequent commits
            7. **Repeat** → Next scenario
            
            ## Test Pyramid Strategy
            - **Unit Tests** (70%): Fast, isolated, numerous
            - **Integration Tests** (20%): Module boundaries
            - **Acceptance Tests** (10%): User scenarios
            
            ## Outside-In vs Inside-Out
            - **Outside-In**: Start with user-facing test → Mock internals → Implement details
            - **Inside-Out**: Start with core logic → Build outward → Integrate components
            
            ## Common Anti-patterns to Avoid
            - Testing implementation details
            - Fragile tests tied to internals  
            - Missing assertions
            - Slow, environment-dependent tests
            - Ignored failing tests
            
            ## When Tests Fail
            1. **Identify**: Regression, flaky test, or spec change?
            2. **Isolate**: Narrow down the cause
            3. **Fix**: Code bug or test bug
            4. **Learn**: Add missing test cases
            
            ## Team Practices
            - CI/CD integration mandatory
            - No merge without tests
            - Test code = Production code quality
            - Pair programming for complex tests
            - Regular test refactoring
            
            ## Pragmatic Exceptions
            - UI/Graphics: Manual + snapshot tests
            - Performance: Benchmark suites
            - Exploratory: Spike then test
            - Legacy: Test on change
            
            ## Remember
            - Tests are living documentation
            - Test behavior, not implementation
            - Small steps, fast feedback
            - When in doubt, write a test
            ```
            
    2. 계획 수립 및 구현
        
        먼저 테스트 구현 계획을 세운 뒤, 하나하나 구현합니다.
        
        이는 챌린지 과제 내용입니다. 직접 프롬프트를 작성해서 진행해보세요!