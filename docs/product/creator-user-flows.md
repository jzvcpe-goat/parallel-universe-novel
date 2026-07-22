# Creator User Flows

## Flow 1: Start The Day

1. Author opens the author workbench on their own device.
2. If signed out, the author sees capability preview and disabled actions.
3. If signed in, Creator shows the three most important tasks:
   - one request worth writing,
   - one active draft,
   - one item needing publish confirmation.
4. Creator also summarizes real work readiness:
   - manageable works,
   - active main or IF lines,
   - published chapters,
   - open reader requests.
5. The first request card explains why it is prioritized:
   - continue in-progress requests,
   - then acknowledged requests,
   - then sort by votes and submission time.
6. Clicking the active draft or publish candidate preserves the exact local
   draft reference so the author lands on the intended writing or publish
   context.

## Flow 2: Handle Reader Request

1. Author opens 读者请求.
2. Author filters by work, request type, and status.
3. Author sorts by heat or time.
4. Author can select saved views for all requests, needs action, hot requests,
   active writing, branch requests, and finished requests.
5. Author can temporarily view only similar requests; this does not permanently
   merge records in P0.
6. Author marks a request as 已看到 or starts writing.
7. Starting writing first moves 已收到 to 已看到, then moves 已看到 to 处理中.
8. Author can choose 暂不处理 after confirmation.
9. The detail peek follows the active queue filters and exposes the same safe
   actions as the selected request card.

## Flow 3: Write Privately

1. Author opens 写作台 from a request or starts manually.
2. Request context stays in the left rail.
3. Title and prose editor stay centered and quiet.
4. Destination and publish readiness stay in the right rail.
5. Creator confirms author status before allowing private draft save or publish handoff.
6. Draft prose is saved locally.
7. Save and publish handoff expose in-progress states and disable duplicate clicks.
8. Entering publish check carries the same local draft reference forward.

## Flow 4: Confirm Publication

1. Author opens 发布检查.
2. If the author arrives from Today or Writing Desk, the intended local draft is selected.
3. Creator shows work, branch, anchor, linked request, title, preview, reader-facing location, and impact.
4. Required gates must pass.
5. Warnings may be accepted with author confirmation.
6. Publish exposes an in-progress state and prevents duplicate confirmation.
7. Publish writes public chapter/branch records and updates request status.
8. After success, Creator shows a publish result summary with work, line, chapter, request impact, and time.

## Flow 5: Manage Works And Lines

1. Author opens 作品与支线.
2. Author chooses a work from the left rail.
3. Creator shows the selected work, each main or IF line, and the chapters under each line.
4. Selecting a line updates the right detail panel with line type, status, chapter count, request count, parent line, parent chapter, and last update.
5. Author can save an author notice with an in-progress state.
6. Hiding a work and archiving an IF line require confirmation and show in-progress states.
7. Creating an IF line requires a title and can choose a parent line and anchor chapter.
8. The author can jump from a selected line into Writing Desk with that line preselected.

## Flow 6: Manage The Local Workspace

1. Author opens 本机工作区 on their own device.
2. Author reviews local records, backup/recovery state, assistant permissions, and recent operations.
3. Author can export a versioned workspace package; import requires preview and confirmation.
4. Author can reduce motion and transparency.
5. Saving display preferences exposes an in-progress state.
6. Author can reset display preferences after confirmation.
7. Resetting display preferences never affects drafts, writing assets, backups, or published content.
8. Model, provider, service-address, and credential setup are not exposed as a product workflow.
