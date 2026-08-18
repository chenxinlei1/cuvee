{{- define "cuvee.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "cuvee.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "cuvee.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "cuvee.labels" -}}
helm.sh/chart: {{ include "cuvee.chart" . }}
app.kubernetes.io/name: {{ include "cuvee.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "cuvee.selectorLabels" -}}
app.kubernetes.io/name: {{ include "cuvee.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "cuvee.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "cuvee.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{- define "cuvee.image" -}}
{{- printf "%s:%s" .Values.image.repository (default .Chart.AppVersion .Values.image.tag) }}
{{- end }}

{{- define "cuvee.dataVolumes" -}}
{{- if .Values.persistence.enabled }}
- name: data
  persistentVolumeClaim:
    claimName: {{ include "cuvee.fullname" . }}-data
{{- end }}
{{- end }}

{{- define "cuvee.dataMounts" -}}
{{- if .Values.persistence.enabled }}
- name: data
  mountPath: /persistent
{{- end }}
{{- end }}

{{- define "cuvee.dataInitContainer" -}}
{{- if .Values.persistence.enabled }}
- name: initialize-data
  image: {{ include "cuvee.image" . | quote }}
  imagePullPolicy: {{ .Values.image.pullPolicy }}
  command: ["/bin/sh", "-c", "cp -Rn /app/data/. /persistent/ || true"]
  securityContext:
    {{- toYaml .Values.securityContext | nindent 4 }}
  volumeMounts:
    {{- include "cuvee.dataMounts" . | nindent 4 }}
{{- end }}
{{- end }}
