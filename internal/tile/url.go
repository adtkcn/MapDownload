package tile

import (
	"math"
	"strconv"
	"strings"

	"map/internal/model"
)

// BuildURL 生成瓦片 URL
//
// hostOffset 为额外的轮转偏移，重试时递增即可自动切换到下一个域名；
// 基础偏移为 (x + y)，与 maptalks 的 {s} 取值规则一致。
func BuildURL(rule model.TileUrlRule, z, x, y, hostOffset int) string {
	ty := y
	if rule.FlipY {
		ty = int(math.Pow(2, float64(z))) - 1 - y
	}

	data := map[string]string{
		"x": strconv.Itoa(x),
		"y": strconv.Itoa(ty),
		"z": strconv.Itoa(z),
		"s": pickSubdomain(rule.Subdomains, x, y),
		"m": strconv.Itoa(x / 16),
		"n": strconv.Itoa(ty / 16),
	}
	for key, value := range rule.CustomTags {
		data[key] = anyToString(value)
	}

	url := replacePlaceholders(rule.Template, data)
	return rotateHost(url, rule.Hosts, x+y+hostOffset)
}

// HostCount 该规则可用的域名数量，用于分摊并发连接数
func HostCount(rule model.TileUrlRule) int {
	if n := len(rule.Hosts); n > 0 {
		return n
	}
	if n := len(rule.Subdomains); n > 0 {
		return n
	}
	return 1
}

func pickSubdomain(subdomains []any, x, y int) string {
	if len(subdomains) == 0 {
		return ""
	}
	return anyToString(subdomains[mod(x+y, len(subdomains))])
}

// rotateHost 用主机池替换 URL 的 host 部分，实现多域名轮转
func rotateHost(rawURL string, hosts []string, offset int) string {
	if len(hosts) == 0 {
		return rawURL
	}
	const schemeSep = "://"
	i := strings.Index(rawURL, schemeSep)
	if i < 0 {
		return rawURL
	}
	prefix := rawURL[:i+len(schemeSep)]
	rest := rawURL[i+len(schemeSep):]

	host := hosts[mod(offset, len(hosts))]
	if slash := strings.IndexAny(rest, "/?#"); slash >= 0 {
		return prefix + host + rest[slash:]
	}
	return prefix + host
}

// replacePlaceholders 替换 {key} 占位符，未知占位符保持原样
func replacePlaceholders(tmpl string, data map[string]string) string {
	var b strings.Builder
	b.Grow(len(tmpl) + 32)
	for i := 0; i < len(tmpl); {
		if tmpl[i] == '{' {
			if j := strings.IndexByte(tmpl[i:], '}'); j > 0 {
				key := tmpl[i+1 : i+j]
				if value, ok := data[key]; ok {
					b.WriteString(value)
					i += j + 1
					continue
				}
			}
		}
		b.WriteByte(tmpl[i])
		i++
	}
	return b.String()
}

func anyToString(v any) string {
	switch value := v.(type) {
	case string:
		return value
	case float64:
		return strconv.Itoa(int(value))
	case int:
		return strconv.Itoa(value)
	default:
		return ""
	}
}

func mod(value, length int) int {
	r := value % length
	if r < 0 {
		r += length
	}
	return r
}
