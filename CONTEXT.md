# StudyDesk

A personal, single-user dashboard for one student: tracks courses, assignments and grades by hand, surfaces Outlook mail, and is installed as an app on the student's own devices.

## Language

**Course**:
A class the student is taking this term, created by hand, with a weekly meeting schedule, an instructor, and a Grade Scheme.
_Avoid_: Class, subject

**Assignment**:
A piece of work with a due date that belongs to a Course, entered by hand and tracked until it is finished.
_Avoid_: Task, to-do, homework, event

**Complete** (an Assignment):
The student is finished with it, so it is permanently deleted after a confirmation.
_Avoid_: Mark done, archive, dismiss

**Reminder**:
A push alert, sent from the student's own server, that Assignments are due today.
_Avoid_: Notification, alert

**Term**:
A label for the current semester shown in page headers; it does not group or filter Courses.
_Avoid_: Semester (in code and docs)

### Grades

**Grade Scheme**:
The set of Grade Categories for one Course, whose weights make up the Current Grade.
_Avoid_: Grading policy, syllabus weights

**Grade Category**:
A named, weighted share of a Course's grade, such as Exams 40%.
_Avoid_: Bucket, group

**Grade Entry**:
A single score the student records by hand and files under one Grade Category of a Course. It stands alone; it is not tied to an Assignment.
_Avoid_: Mark, result

**Current Grade**:
A Course's weighted percentage, computed over only the Grade Categories that have Grade Entries, with their weights rescaled to total 100.
_Avoid_: Course grade, average

### Mail

**Notification**:
An email received by the student's Outlook account, shown read-only in the Notifications section with its sender and a link to open it in Outlook.
_Avoid_: Message, email item, alert

**Mail Sync**:
Fetching recent Notifications from Outlook, either on demand by the student or automatically once every 24 hours.
_Avoid_: Mail refresh, mail poll

### Navigation

**Dashboard**:
The home page: summary cards, the next due Assignments, recent Notifications, the week ahead and each Course's Current Grade.
_Avoid_: Home, overview

**Schedule**:
The weekly timetable of when each Course meets.
_Avoid_: Timetable

**Calendar**:
A month grid of when open Assignments are due. It is not the Schedule.
_Avoid_: Planner

**Links**:
The student's saved shortcuts to external sites such as the school portal.
_Avoid_: Bookmarks
