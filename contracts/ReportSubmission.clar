(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-DRUG-ID u101)
(define-constant ERR-INVALID-SEVERITY u102)
(define-constant ERR-INVALID-DESCRIPTION u103)
(define-constant ERR-INVALID-HASH u104)
(define-constant ERR-INVALID-TIMESTAMP u105)
(define-constant ERR-REPORT-ALREADY-EXISTS u106)
(define-constant ERR-REPORT-NOT-FOUND u107)
(define-constant ERR-INVALID-USER u108)
(define-constant ERR-INVALID-STATUS u109)
(define-constant ERR-INVALID-LOCATION u110)
(define-constant ERR-AUTHORITY-NOT-SET u111)
(define-constant ERR-INVALID-REPORT-ID u112)
(define-constant ERR-INVALID-METADATA u113)
(define-constant ERR-INVALID-ANONYMOUS-ID u114)
(define-constant ERR-INVALID-REPORT-COUNT u115)

(define-data-var next-report-id uint u0)
(define-data-var max-reports uint u1000000)
(define-data-var authority-contract (optional principal) none)
(define-data-var submission-fee uint u500)

(define-map reports
  uint
  {
    drug-id: uint,
    anonymous-id: (buff 32),
    description: (string-utf8 500),
    severity: uint,
    timestamp: uint,
    submitter: principal,
    location: (string-utf8 100),
    status: (string-utf8 20),
    evidence-hash: (buff 32),
    metadata: (string-utf8 200)
  }
)

(define-map reports-by-hash
  (buff 32)
  uint)

(define-map report-updates
  uint
  {
    update-description: (string-utf8 500),
    update-severity: uint,
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-report (id uint))
  (map-get? reports id)
)

(define-read-only (get-report-updates (id uint))
  (map-get? report-updates id)
)

(define-read-only (is-report-registered (hash (buff 32)))
  (is-some (map-get? reports-by-hash hash))
)

(define-read-only (get-report-count)
  (ok (var-get next-report-id))
)

(define-private (validate-drug-id (id uint))
  (if (> id u0)
      (ok true)
      (err ERR-INVALID-DRUG-ID))
)

(define-private (validate-severity (severity uint))
  (if (and (>= severity u1) (<= severity u5))
      (ok true)
      (err ERR-INVALID-SEVERITY))
)

(define-private (validate-description (desc (string-utf8 500)))
  (if (and (> (len desc) u0) (<= (len desc) u500))
      (ok true)
      (err ERR-INVALID-DESCRIPTION))
)

(define-private (validate-evidence-hash (hash (buff 32)))
  (if (> (len hash) u0)
      (ok true)
      (err ERR-INVALID-HASH))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-status (status (string-utf8 20)))
  (if (or (is-eq status u"pending") (is-eq status u"verified") (is-eq status u"rejected"))
      (ok true)
      (err ERR-INVALID-STATUS))
)

(define-private (validate-anonymous-id (id (buff 32)))
  (if (> (len id) u0)
      (ok true)
      (err ERR-INVALID-ANONYMOUS-ID))
)

(define-private (validate-metadata (meta (string-utf8 200)))
  (if (<= (len meta) u200)
      (ok true)
      (err ERR-INVALID-METADATA))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-SET))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-submission-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-REPORT-COUNT))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-SET))
    (var-set submission-fee new-fee)
    (ok true)
  )
)

(define-public (submit-report
  (drug-id uint)
  (anonymous-id (buff 32))
  (description (string-utf8 500))
  (severity uint)
  (location (string-utf8 100))
  (evidence-hash (buff 32))
  (metadata (string-utf8 200))
)
  (let (
        (next-id (var-get next-report-id))
        (current-max (var-get max-reports))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-INVALID-REPORT-COUNT))
    (try! (validate-drug-id drug-id))
    (try! (validate-anonymous-id anonymous-id))
    (try! (validate-description description))
    (try! (validate-severity severity))
    (try! (validate-location location))
    (try! (validate-evidence-hash evidence-hash))
    (try! (validate-metadata metadata))
    (asserts! (is-none (map-get? reports-by-hash evidence-hash)) (err ERR-REPORT-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-SET))))
      (try! (stx-transfer? (var-get submission-fee) tx-sender authority-recipient))
    )
    (map-set reports next-id
      {
        drug-id: drug-id,
        anonymous-id: anonymous-id,
        description: description,
        severity: severity,
        timestamp: block-height,
        submitter: tx-sender,
        location: location,
        status: u"pending",
        evidence-hash: evidence-hash,
        metadata: metadata
      }
    )
    (map-set reports-by-hash evidence-hash next-id)
    (var-set next-report-id (+ next-id u1))
    (print { event: "report-submitted", id: next-id })
    (ok next-id)
  )
)

(define-public (update-report
  (report-id uint)
  (update-description (string-utf8 500))
  (update-severity uint)
)
  (let ((report (map-get? reports report-id)))
    (match report
      r
        (begin
          (asserts! (is-eq (get submitter r) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-description update-description))
          (try! (validate-severity update-severity))
          (map-set reports report-id
            {
              drug-id: (get drug-id r),
              anonymous-id: (get anonymous-id r),
              description: update-description,
              severity: update-severity,
              timestamp: block-height,
              submitter: (get submitter r),
              location: (get location r),
              status: (get status r),
              evidence-hash: (get evidence-hash r),
              metadata: (get metadata r)
            }
          )
          (map-set report-updates report-id
            {
              update-description: update-description,
              update-severity: update-severity,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "report-updated", id: report-id })
          (ok true)
        )
      (err ERR-REPORT-NOT-FOUND)
    )
  )
)