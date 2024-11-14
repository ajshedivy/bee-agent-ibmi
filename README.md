# 🐝 IBM i Bee Agent

This repository contains the IBM i Bee Agent for the Bee Agent Framework.

## ✨ Key Features

- 🔥 Safely execute SQL queries using [Mapepire](https://mapepire-ibmi.github.io/)
- 🔎 Get complete visibility into agents' decisions using our MLFlow integration thanks to [Bee Observe](https://github.com/i-am-bee/bee-observe).
- 🚀 Fully fledged TypeScript project setup with linting and formatting.

## 🛠️ Getting started

1. Clone this repository `git clone https://github.com/ajshedivy/bee-agent-ibmi.git`
2. Install dependencies `npm ci`.
3. Configure your project by filling in missing values in the `.env` file (default LLM provider is locally hosted `Ollama`).
4. Run the agent `npm run start src/agent.ts`

To run an agent with a custom prompt, simply do this `npm run start src/agent.ts <<< 'Hello Bee!'`

## ✏️ Examples

```bash
npm run start src/agent.ts <<< "what employee has the highest salary?"
```

Result:

```json
> start
> NODE_OPTIONS='--no-deprecation' npm exec tsx src/agent.ts

User 👤 : what employee has the highest salary?
Agent 🤖 (thought) : The user wants to find the employee with the highest salary. I can do this by querying the 'EMPLOYEE' table and sorting the results by salary in descending order.

Agent 🤖 (tool_name) : IBMiTool
Agent 🤖 (tool_input) : {"query":"SELECT EMPNO, FIRSTNME, LASTNAME, SALARY FROM EMPLOYEE ORDER BY SALARY DESC LIMIT 1"}
Agent 🤖 (tool_output) : {"success":true,"result":[{"EMPNO":"000010","FIRSTNME":"CHRISTINE","LASTNAME":"HAAS","SALARY":52750}]}
Agent 🤖 (final_answer) : The employee with the highest salary is Christine Haas with a salary of $52,750.
Agent 🤖 : The employee with the highest salary is Christine Haas with a salary of $52,750.
```

We can add to this example by asking to find the employee with the highest salary in each department:

```bash
npm run start src/agent.ts <<< "what employee has the highest salary in each department?"
```

Result:

```json
> start
> NODE_OPTIONS='--no-deprecation' npm exec tsx src/agent.ts

User 👤 : what employee has the highest salary in each department?
Agent 🤖 (thought) : The user wants to find the employee with the highest salary in each department. I can do this by joining the 'EMPLOYEE' and 'DEPARTMENT' tables and using a subquery to find the maximum salary for each department.

Agent 🤖 (tool_name) : IBMiTool
Agent 🤖 (tool_input) : {"query":"SELECT E.EMPNO, E.FIRSTNME, E.LASTNAME, E.JOB, E.SALARY FROM EMPLOYEE E INNER JOIN DEPARTMENT D ON E.WORKDEPT = D.DEPTNO WHERE E.SALARY = (SELECT MAX(E2.SALARY) FROM EMPLOYEE E2 INNER JOIN DEPARTMENT D2 ON E2.WORKDEPT = D2.DEPTNO WHERE D2.DEPTNO = D.DEPTNO)"}
Agent 🤖 (tool_output) : {"success":true,"result":[{"EMPNO":"000010","FIRSTNME":"CHRISTINE","LASTNAME":"HAAS","JOB":"PRES","SALARY":52750},{"EMPNO":"000020","FIRSTNME":"MICHAEL","LASTNAME":"THOMPSON","JOB":"MANAGER","SALARY":41250},{"EMPNO":"000030","FIRSTNME":"SALLY","LASTNAME":"KWAN","JOB":"MANAGER","SALARY":38250},{"EMPNO":"000060","FIRSTNME":"IRVING","LASTNAME":"STERN","JOB":"MANAGER","SALARY":32250},{"EMPNO":"000070","FIRSTNME":"EVA","LASTNAME":"PULASKI","JOB":"MANAGER","SALARY":36170},{"EMPNO":"000050","FIRSTNME":"JOHN","LASTNAME":"GEYER","JOB":"MANAGER","SALARY":40175},{"EMPNO":"000090","FIRSTNME":"EILEEN","LASTNAME":"HENDERSON","JOB":"MANAGER","SALARY":29750},{"EMPNO":"000100","FIRSTNME":"THEODORE","LASTNAME":"SPENSER","JOB":"MANAGER","SALARY":26150}]}
Agent 🤖 (final_answer) : Here are the employees with the highest salary in each department:

- President: Christine Haas with a salary of $52,750
- Manager: Michael Thompson with a salary of $41,250
- Manager: Sally Kwan with a salary of $38,250
- Manager: Irving Stern with a salary of $32,250
- Manager: Eva Pulaski with a salary of $36,170
- Manager: John Geyer with a salary of $40,175
- Manager: Eileen Henderson with a salary of $29,750
- Manager: Theodore Spenser with a salary of $26,150
Agent 🤖 : Here are the employees with the highest salary in each department:

- President: Christine Haas with a salary of $52,750
- Manager: Michael Thompson with a salary of $41,250
- Manager: Sally Kwan with a salary of $38,250
- Manager: Irving Stern with a salary of $32,250
- Manager: Eva Pulaski with a salary of $36,170
- Manager: John Geyer with a salary of $40,175
- Manager: Eileen Henderson with a salary of $29,750
- Manager: Theodore Spenser with a salary of $26,150
```

The Agent is able to find the employee with the highest salary in each department by correctly joining the `EMPLOYEE` and `DEPARTMENT` tables 😎💪

# 🐝 Bee Agent Framework Template Info

<details>
<summary>Click to expand</summary>

📚 See the [documentation](https://i-am-bee.github.io/bee-agent-framework/) to learn more.

## 📦 Requirements

- JavaScript runtime [NodeJS > 18](https://nodejs.org/) (ideally installed via [nvm](https://github.com/nvm-sh/nvm)).
- Container system like [Rancher Desktop](https://rancherdesktop.io/), [Podman](https://podman.io/) (VM must be rootfull machine) or [Docker](https://www.docker.com/).
- LLM Provider either external [WatsonX](https://www.ibm.com/watsonx) (OpenAI, Groq, ...) or local [ollama](https://ollama.com).

## 🏗 Infrastructure

> [!NOTE]
>
> Docker distribution with support for _compose_ is required, the following are supported:
>
> - [Docker](https://www.docker.com/)
> - [Rancher](https://www.rancher.com/) - macOS users may want to use VZ instead of QEMU
> - [Podman](https://podman.io/) - requires [compose](https://podman-desktop.io/docs/compose/setting-up-compose) and **rootful machine** (if your current machine is rootless, please create a new one, also ensure you have enabled Docker compatibility mode).

## 🔒Code interpreter

The [Bee Code Interpreter](https://github.com/i-am-bee/bee-code-interpreter) is a gRPC service that an agent uses to execute an arbitrary Python code safely.

### Instructions

1. Start all services related to the [`Code Interpreter`](https://github.com/i-am-bee/bee-code-interpreter) `npm run infra:start --profile=code_interpreter`
2. Run the agent `npm run start src/agent_code_interpreter.ts`

> [!NOTE]
>
> Code Interpreter runs on `http://127.0.0.1:50051`.

## 🔎 Observability

Get complete visibility of the agent's inner workings via our observability stack.

- The [MLFlow](https://mlflow.org/) is used as UI for observability.
- The [Bee Observe](https://github.com/i-am-bee/bee-observe) is the observability service (API) for gathering traces from [Bee Agent Framework](https://github.com/i-am-bee/bee-agent-framework).
- The [Bee Observe Connector](https://github.com/i-am-bee/bee-observe-connector) is the observability connector that sends traces from [Bee Agent Framework](https://github.com/i-am-bee/bee-agent-framework) to [Bee Observe](https://github.com/i-am-bee/bee-observe).

### Instructions

1. Start all services related to [Bee Observe](https://github.com/i-am-bee/bee-observe) `npm run infra:start --profile=observe`
2. Run the agent `npm run start src/agent_observe.ts`
3. See visualized trace in MLFlow web application [`http://127.0.0.1:8080/#/experiments/0`](http://localhost:8080/#/experiments/0)

> [!TIP]
>
> Configuration file is [infra/observe/.env.docker](./infra/observe/.env.docker).
